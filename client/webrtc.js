let localStream;
let localVideo;
let peerConnection;
let remoteVideo;
let serverConnection;
let uuid;

const peerConnectionConfig = {
  'iceServers': [
    {'urls': 'stun:stun.l.google.com:19302'},
  ]
};

async function pageReady() {
  uuid = createUUID();

  localVideo = document.getElementById('localVideo');
  remoteVideo = document.getElementById('remoteVideo');

  serverConnection = new WebSocket(`wss://${window.location.hostname}:8443`);
  serverConnection.onmessage = gotMessageFromServer;

  const constraints = {
    video: true,
    audio: true,
  };

  if(!navigator.mediaDevices.getUserMedia) {
    alert('Your browser does not support getUserMedia API');
    return;
  }

  // Create a canvas element
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const context = canvas.getContext('2d');

  try {
    // Create a video stream from the canvas
    localStream = canvas.captureStream(30); // 30 FPS
    localVideo.srcObject = localStream;

    // Draw random colors on the canvas
    setInterval(() => {
      context.fillStyle = `rgb(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)})`;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }, 100); // Update every 100ms
  } catch(error) {
    errorHandler(error);
  }
}

function start(isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = gotIceCandidate;
  peerConnection.ontrack = gotRemoteStream;

  for(const track of localStream.getTracks()) {
    peerConnection.addTrack(track, localStream);
  }

  if(isCaller) {
    peerConnection.createOffer().then(createdDescription).catch(errorHandler);
  }
}

function gotMessageFromServer(message) {
  if(!peerConnection) start(false);

  const signal = JSON.parse(message.data);

  if(signal.uuid == uuid) return;

  if(signal.sdp) {
    peerConnection.setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
      if(signal.sdp.type !== 'offer') return;

      peerConnection.createAnswer().then(createdDescription).catch(errorHandler);
    }).catch(errorHandler);
  } else if(signal.ice) {
    peerConnection.addIceCandidate(new RTCIceCandidate(signal.ice)).catch(errorHandler);
  }
}

function gotIceCandidate(event) {
  if(event.candidate != null) {
    serverConnection.send(JSON.stringify({'ice': event.candidate, 'uuid': uuid}));
  }
}

function createdDescription(description) {
  console.log('got description');

  peerConnection.setLocalDescription(description).then(() => {
    serverConnection.send(JSON.stringify({'sdp': peerConnection.localDescription, 'uuid': uuid}));
  }).catch(errorHandler);
}

function gotRemoteStream(event) {
  console.log('got remote stream');
  remoteVideo.srcObject = event.streams[0];
}

function errorHandler(error) {
  console.log(error);
}

function createUUID() {
  return `RANDOM-${Math.floor(Math.random() * 10)}`;
}
