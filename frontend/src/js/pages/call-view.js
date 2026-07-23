/**
 * Call View Page
 * Active call interface with WebRTC
 */
import { Auth } from '../utils/auth.js';
import { Toast } from '../utils/toast.js';
import { Router } from '../router.js';
import API from '../utils/api.js';
import WebRTCManager from '../utils/webrtc.js';
import { Socket } from '../utils/socket.js';

let callManager = null;
let callData = null;
let timerInterval = null;
let seconds = 0;

export function CallView(params) {
  const callId = params.id;
  
  return `
    <div class="call-view-page" data-call-id="${callId}">
      <div class="call-container">
        <div class="call-remote-video" id="remoteVideo">
          <div class="call-remote-placeholder">
            <div class="call-avatar-large">
              <span id="callerName">Connecting...</span>
            </div>
            <div class="call-status-text" id="callStatusText">Connecting...</div>
            <div class="call-timer" id="callTimer">00:00</div>
          </div>
          <video id="remoteVideoElement" autoplay playsinline></video>
        </div>
        
        <div class="call-local-video" id="localVideoContainer">
          <video id="localVideoElement" autoplay playsinline muted></video>
        </div>

        <div class="call-controls">
          <button class="call-control-btn" id="callMuteBtn" title="Mute">
            <span class="control-icon">🎤</span>
          </button>
          <button class="call-control-btn" id="callVideoBtn" title="Video">
            <span class="control-icon">📹</span>
          </button>
          <button class="call-control-btn call-end-btn" id="callEndBtn" title="End Call">
            <span class="control-icon">📞</span>
          </button>
          <button class="call-control-btn" id="callScreenBtn" title="Share Screen">
            <span class="control-icon">🖥️</span>
          </button>
          <button class="call-control-btn" id="callSpeakerBtn" title="Speaker">
            <span class="control-icon">🔊</span>
          </button>
        </div>
      </div>
    </div>
  `;
}

export function initCallView() {
  const container = document.querySelector('.call-view-page');
  const callId = container?.dataset.callId;

  if (!callId) {
    Toast.error('Invalid call');
    Router.navigate('calls');
    return;
  }

  initCall(callId);
}

async function initCall(callId) {
  try {
    // Get call details
    const response = await API.get(`/calls/${callId}`);
    callData = response.call;

    if (!callData) {
      Toast.error('Call not found');
      Router.navigate('calls');
      return;
    }

    const user = Auth.getCurrentUser();
    const isInitiator = callData.caller_id === user.id;

    // Initialize WebRTC
    callManager = WebRTCManager;
    const isVideo = callData.type === 'video';

    // Set up video elements
    const localVideo = document.getElementById('localVideoElement');
    const remoteVideo = document.getElementById('remoteVideoElement');

    // Initialize WebRTC
    await callManager.init(callId, isInitiator ? callData.callee_id : callData.caller_id, isVideo);

    // Set callbacks
    callManager.onTrack((stream) => {
      remoteVideo.srcObject = stream;
      document.getElementById('remoteVideo').classList.add('has-video');
      document.querySelector('.call-remote-placeholder').style.display = 'none';
    });

    callManager.onStatusChange((state) => {
      updateCallStatus(state);
    });

    // Get local stream
    const localStream = callManager.localStream;
    if (localStream) {
      localVideo.srcObject = localStream;
    }

    // If initiator, create offer
    if (isInitiator) {
      await callManager.createOffer();
      updateCallStatus('calling');
    }

    // Setup socket listeners for call signaling
    setupCallSignaling(callId);

    // Setup UI controls
    setupCallControls();

    // Start timer
    startTimer();

    // Handle page unload
    window.addEventListener('beforeunload', () => {
      endCall();
    });

  } catch (error) {
    console.error('Init call error:', error);
    Toast.error('Failed to initialize call');
    Router.navigate('calls');
  }
}

function setupCallSignaling(callId) {
  // Remove existing listeners
  Socket.off('call_signal');
  Socket.off('call_answered');
  Socket.off('call_rejected');
  Socket.off('call_ended');
  Socket.off('call_mute');
  Socket.off('call_video');
  Socket.off('call_screen_share');

  // Handle incoming signals
  Socket.on('call_signal', async (data) => {
    if (data.callId !== callId) return;

    try {
      switch (data.type) {
        case 'offer':
          await callManager.handleOffer(data.data.sdp);
          break;
        case 'answer':
          await callManager.handleAnswer(data.data.sdp);
          break;
        case 'ice':
          await callManager.handleIceCandidate(data.data.candidate);
          break;
      }
    } catch (error) {
      console.error('Signal handling error:', error);
    }
  });

  // Call answered
  Socket.on('call_answered', (data) => {
    if (data.callId !== callId) return;
    updateCallStatus('connected');
    startTimer();
    Toast.info('Call connected');
  });

  // Call rejected
  Socket.on('call_rejected', (data) => {
    if (data.callId !== callId) return;
    Toast.error('Call rejected');
    endCall();
  });

  // Call ended
  Socket.on('call_ended', (data) => {
    if (data.callId !== callId) return;
    Toast.info(`Call ended (${formatDuration(data.duration)})`);
    endCall();
  });

  // Mute status
  Socket.on('call_mute', (data) => {
    if (data.callId !== callId) return;
    const muteBtn = document.getElementById('callMuteBtn');
    if (data.muted) {
      muteBtn.classList.add('active');
      muteBtn.querySelector('.control-icon').textContent = '🔇';
    } else {
      muteBtn.classList.remove('active');
      muteBtn.querySelector('.control-icon').textContent = '🎤';
    }
  });

  // Video status
  Socket.on('call_video', (data) => {
    if (data.callId !== callId) return;
    const videoBtn = document.getElementById('callVideoBtn');
    if (data.enabled) {
      videoBtn.classList.remove('active');
      videoBtn.querySelector('.control-icon').textContent = '📹';
    } else {
      videoBtn.classList.add('active');
      videoBtn.querySelector('.control-icon').textContent = '🚫';
    }
  });

  // Screen sharing status
  Socket.on('call_screen_share', (data) => {
    if (data.callId !== callId) return;
    const screenBtn = document.getElementById('callScreenBtn');
    if (data.enabled) {
      screenBtn.classList.add('active');
    } else {
      screenBtn.classList.remove('active');
    }
  });
}

function setupCallControls() {
  // Mute button
  document.getElementById('callMuteBtn').addEventListener('click', () => {
    const muted = callManager.toggleMute();
    const btn = document.getElementById('callMuteBtn');
    if (muted) {
      btn.classList.add('active');
      btn.querySelector('.control-icon').textContent = '🔇';
    } else {
      btn.classList.remove('active');
      btn.querySelector('.control-icon').textContent = '🎤';
    }
    Socket.emit('call_mute', {
      callId: callData.id,
      muted
    });
  });

  // Video button
  document.getElementById('callVideoBtn').addEventListener('click', async () => {
    const enabled = callManager.toggleVideo();
    const btn = document.getElementById('callVideoBtn');
    if (enabled) {
      btn.classList.remove('active');
      btn.querySelector('.control-icon').textContent = '📹';
    } else {
      btn.classList.add('active');
      btn.querySelector('.control-icon').textContent = '🚫';
    }
    Socket.emit('call_video', {
      callId: callData.id,
      enabled
    });
  });

  // End call button
  document.getElementById('callEndBtn').addEventListener('click', () => {
    if (confirm('End call?')) {
      endCall();
    }
  });

  // Screen sharing button
  document.getElementById('callScreenBtn').addEventListener('click', async () => {
    try {
      const enabled = await callManager.startScreenSharing();
      const btn = document.getElementById('callScreenBtn');
      if (enabled) {
        btn.classList.add('active');
        Toast.info('Screen sharing started');
      }
      Socket.emit('call_screen_share', {
        callId: callData.id,
        enabled: true
      });
    } catch (error) {
      Toast.error('Failed to share screen');
    }
  });

  // Speaker button
  document.getElementById('callSpeakerBtn').addEventListener('click', () => {
    const btn = document.getElementById('callSpeakerBtn');
    const isSpeaker = btn.classList.toggle('active');
    btn.querySelector('.control-icon').textContent = isSpeaker ? '🔊' : '🔈';
    // Toggle audio output
    if (callManager.remoteStream) {
      const audioEl = document.getElementById('remoteVideoElement');
      audioEl.sinkId = isSpeaker ? 'default' : 'none';
    }
  });
}

function updateCallStatus(status) {
  const statusText = document.getElementById('callStatusText');
  const statusMap = {
    'calling': 'Calling...',
    'ringing': 'Ringing...',
    'connected': 'Connected',
    'disconnected': 'Disconnected',
    'failed': 'Call failed'
  };
  
  if (statusText) {
    statusText.textContent = statusMap[status] || status;
  }

  // Update caller name
  const callerName = document.getElementById('callerName');
  if (callerName) {
    const user = Auth.getCurrentUser();
    const isInitiator = callData.caller_id === user.id;
    const otherUser = isInitiator ? callData.callee : callData.caller;
    callerName.textContent = otherUser?.display_name || 'User';
  }
}

function startTimer() {
  seconds = 0;
  if (timerInterval) clearInterval(timerInterval);
  
  timerInterval = setInterval(() => {
    seconds++;
    const timer = document.getElementById('callTimer');
    if (timer) {
      timer.textContent = formatDuration(seconds);
    }
  }, 1000);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

async function endCall() {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  if (callManager) {
    // End call via API
    try {
      await API.put(`/calls/${callData.id}/end`);
    } catch (error) {
      console.error('End call error:', error);
    }

    // Cleanup WebRTC
    callManager.endCall();
    callManager = null;
  }

  // Navigate back
  setTimeout(() => {
    Router.navigate('calls');
  }, 500);
}

// Styles
const callViewStyles = `
.call-view-page {
  position: fixed;
  inset: 0;
  background: var(--bg-primary);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-container {
  width: 100%;
  height: 100%;
  max-width: 1200px;
  max-height: 800px;
  position: relative;
  background: var(--bg-secondary);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.call-remote-video {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  position: relative;
}

.call-remote-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.call-remote-placeholder {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  z-index: 1;
}

.call-avatar-large {
  width: 120px;
  height: 120px;
  border-radius: var(--radius-full);
  background: linear-gradient(135deg, #5865F2, #00D4FF);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  margin: 0 auto var(--space-md);
  color: #fff;
}

.call-status-text {
  font-size: 18px;
  color: var(--text-secondary);
  margin-bottom: var(--space-sm);
}

.call-timer {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
}

.call-local-video {
  position: absolute;
  bottom: 80px;
  right: 20px;
  width: 160px;
  height: 120px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2px solid var(--border-glass);
  background: var(--bg-primary);
  z-index: 2;
}

.call-local-video video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.call-controls {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: var(--space-md);
  padding: var(--space-md);
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-full);
  border: 1px solid var(--border-glass);
  z-index: 3;
}

.call-control-btn {
  width: 52px;
  height: 52px;
  border-radius: var(--radius-full);
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  color: var(--text-primary);
  font-size: 24px;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
  justify-content: center;
}

.call-control-btn:hover {
  background: var(--bg-glass-hover);
  transform: scale(1.05);
}

.call-control-btn.active {
  background: var(--primary);
  border-color: var(--primary);
}

.call-control-btn.call-end-btn {
  background: #EF4444;
  border-color: #EF4444;
  transform: rotate(135deg);
}

.call-control-btn.call-end-btn:hover {
  background: #DC2626;
  transform: scale(1.05) rotate(135deg);
}

.control-icon {
  font-size: 24px;
}

@media (max-width: 768px) {
  .call-container {
    max-height: 100vh;
    border-radius: 0;
  }
  
  .call-local-video {
    width: 120px;
    height: 90px;
    bottom: 100px;
    right: 16px;
  }
  
  .call-control-btn {
    width: 44px;
    height: 44px;
    font-size: 20px;
  }
  
  .control-icon {
    font-size: 20px;
  }
}

@media (max-width: 480px) {
  .call-controls {
    gap: var(--space-sm);
    padding: var(--space-sm);
  }
  
  .call-control-btn {
    width: 40px;
    height: 40px;
    font-size: 16px;
  }
  
  .control-icon {
    font-size: 16px;
  }
  
  .call-local-video {
    width: 80px;
    height: 60px;
    bottom: 80px;
    right: 10px;
  }
}
`;

const styleTag = document.createElement('style');
styleTag.textContent = callViewStyles;
document.head.appendChild(styleTag);
