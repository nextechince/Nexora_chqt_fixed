/**
 * WebRTC Utilities
 * Voice, Video, Screen Sharing
 */
export class WebRTCManager {
  constructor() {
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isScreenSharing = false;
    this.isMuted = false;
    this.isVideoEnabled = true;
    this.callId = null;
    this.chatId = null;
    this.onTrackCallback = null;
    this.onStatusChange = null;
  }

  /**
   * Initialize WebRTC
   */
  async init(callId, chatId, isVideo = false) {
    this.callId = callId;
    this.chatId = chatId;
    this.peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ],
      iceCandidatePoolSize: 10
    });

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal('ice', {
          candidate: event.candidate
        });
      }
    };

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onTrackCallback) {
        this.onTrackCallback(this.remoteStream);
      }
    };

    // Handle connection state
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      if (this.onStatusChange) {
        this.onStatusChange(state);
      }
    };

    // Get local media
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo ? {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      });

      // Add tracks to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });

      return this.localStream;
    } catch (error) {
      console.error('Failed to get media:', error);
      throw error;
    }
  }

  /**
   * Create offer (caller)
   */
  async createOffer() {
    try {
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      this.sendSignal('offer', {
        sdp: offer
      });

      return offer;
    } catch (error) {
      console.error('Create offer error:', error);
      throw error;
    }
  }

  /**
   * Handle offer (callee)
   */
  async handleOffer(offer) {
    try {
      await this.peerConnection.setRemoteDescription(offer);
      
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      this.sendSignal('answer', {
        sdp: answer
      });

      return answer;
    } catch (error) {
      console.error('Handle offer error:', error);
      throw error;
    }
  }

  /**
   * Handle answer
   */
  async handleAnswer(answer) {
    try {
      await this.peerConnection.setRemoteDescription(answer);
    } catch (error) {
      console.error('Handle answer error:', error);
      throw error;
    }
  }

  /**
   * Handle ICE candidate
   */
  async handleIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
    } catch (error) {
      console.error('Add ICE candidate error:', error);
    }
  }

  /**
   * Send signal via socket
   */
  sendSignal(type, data) {
    if (window.socket && this.callId) {
      window.socket.emit('call_signal', {
        callId: this.callId,
        type,
        data,
        userId: this.chatId
      });
    }
  }

  /**
   * Toggle mute
   */
  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !this.isMuted;
      });
    }
    return this.isMuted;
  }

  /**
   * Toggle video
   */
  toggleVideo() {
    this.isVideoEnabled = !this.isVideoEnabled;
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = this.isVideoEnabled;
      });
    }
    return this.isVideoEnabled;
  }

  /**
   * Start screen sharing
   */
  async startScreenSharing() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          cursor: 'always'
        },
        audio: false
      });

      // Replace video track
      const videoTrack = screenStream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(
        s => s.track && s.track.kind === 'video'
      );

      if (sender) {
        await sender.replaceTrack(videoTrack);
      } else {
        this.peerConnection.addTrack(videoTrack, this.localStream);
      }

      this.isScreenSharing = true;

      // Handle screen sharing end
      videoTrack.onended = () => {
        this.stopScreenSharing();
      };

      return true;
    } catch (error) {
      console.error('Start screen sharing error:', error);
      throw error;
    }
  }

  /**
   * Stop screen sharing
   */
  async stopScreenSharing() {
    if (!this.isScreenSharing) return;

    try {
      // Restore camera video
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true
      });

      const videoTrack = stream.getVideoTracks()[0];
      const sender = this.peerConnection.getSenders().find(
        s => s.track && s.track.kind === 'video'
      );

      if (sender) {
        await sender.replaceTrack(videoTrack);
      }

      this.isScreenSharing = false;
      return true;
    } catch (error) {
      console.error('Stop screen sharing error:', error);
      throw error;
    }
  }

  /**
   * Set callbacks
   */
  onTrack(callback) {
    this.onTrackCallback = callback;
  }

  onStatusChange(callback) {
    this.onStatusChange = callback;
  }

  /**
   * End call
   */
  endCall() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.peerConnection) {
      this.peerConnection.close();
    }
    this.peerConnection = null;
    this.localStream = null;
    this.remoteStream = null;
    this.isScreenSharing = false;
  }

  /**
   * Check if WebRTC is supported
   */
  static isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Get list of available devices
   */
  static async getDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return {
        audioInputs: devices.filter(d => d.kind === 'audioinput'),
        audioOutputs: devices.filter(d => d.kind === 'audiooutput'),
        videoInputs: devices.filter(d => d.kind === 'videoinput')
      };
    } catch (error) {
      console.error('Get devices error:', error);
      return { audioInputs: [], audioOutputs: [], videoInputs: [] };
    }
  }
}

// Export singleton
export default new WebRTCManager();
