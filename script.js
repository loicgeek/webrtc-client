window.socket = io('http://localhost:3000', {
       query: {
         token: '123',
       },
     });
socket.on('connect', function() {
    console.log('Connected');
});

socket.on('events', function(data) {
    console.log('event', data);
});
socket.on('exception', function(data) {
    console.log('event', data);
});
socket.on('disconnect', function() {
    console.log('Disconnected');
});
const ROOM_ID = "room"
const videoGrid = document.getElementById('video-grid')

const peer = new Peer(undefined, {
  host: 'localhost',
      port: 9000,
      path: '/myapp',
      debug: 3,
})
// const peer = new Peer({
//   host: 'https://0.peerjs.com',
// })
peer.on('open', (userId) => {
  socket.emit('join-room',{roomId:ROOM_ID,userId})
});
peer.on('error', (error) => {
  console.error(error);
});


const myVideo = document.createElement('video')
myVideo.muted = true
myVideo.setAttribute('class','isme')

const peers = {}
// navigator.mediaDevices.getUserMedia({
//   video: true,
//   audio: true
// }).then(stream => {
//   addVideoStream(myVideo, stream)

//   peer.on('call', call => {
//     console.log('new call peer');
//     call.answer(stream)
//     const video = document.createElement('video')
//     call.on('stream', userVideoStream => {
//       addVideoStream(video, userVideoStream)
//     })
//   })

//   socket.on('user-connected', userId => {
//     console.log('user connected',userId);
//     connectToNewUser(userId, stream)
//   })
// })

// socket.on('user-disconnected', userId => {
//   if (peers[userId]) peers[userId].close()
// })

// peer.on('open', id => {
//   socket.emit('join-room', ROOM_ID, id)
// })

// function connectToNewUser(userId, stream) {
//   const call = peer.call(userId, stream)
//   const video = document.createElement('video')
//   console.log("calling user "+userId);
//   call.on('stream', userVideoStream => {
//     console.log("new call stream",userVideoStream);
//     addVideoStream(video, userVideoStream)
//   })
//   call.on('close', () => {
//     video.remove()
//   })

//   setTimeout(function(){   
//     peers[userId] = call
//     console.log(peers);; 
//   }, 5000);


// }

function addVideoStream(video, stream) {
  video.srcObject = stream
  video.addEventListener('loadedmetadata', () => {
    video.play()
  })
  videoGrid.append(video)
}


// Peer connection implementation

let myPeerConnection;

var mediaConstraints = {
  audio: true, // We want an audio track
  video: true // ...and we want a video track
};

function invite() {
  if (myPeerConnection) {
    alert("You can't start a call because you already have one open!");
  } else {
    createPeerConnection();

    navigator.mediaDevices.getUserMedia(mediaConstraints)
    .then(function(localStream) {
      myVideo.srcObject = localStream;
      localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
    })
    .catch(handleGetUserMediaError);
  }
}
function createPeerConnection() {
  myPeerConnection = new RTCPeerConnection({
      iceServers: [     // Information about ICE servers - Use your own!
        {
          urls: "stun:stun.stunprotocol.org"
        }
      ]
  });

  myPeerConnection.onicecandidate = handleICECandidateEvent;
  myPeerConnection.ontrack = handleTrackEvent;
  myPeerConnection.onnegotiationneeded = handleNegotiationNeededEvent;
  myPeerConnection.onremovetrack = handleRemoveTrackEvent;
  myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
  myPeerConnection.onicegatheringstatechange = handleICEGatheringStateChangeEvent;
  myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}

function handleGetUserMediaError(e) {
  switch(e.name) {
    case "NotFoundError":
      alert("Unable to open your call because no camera and/or microphone" +
            "were found.");
      break;
    case "SecurityError":
    case "PermissionDeniedError":
      // Do nothing; this is the same as the user canceling the call.
      break;
    default:
      alert("Error opening your camera and/or microphone: " + e.message);
      break;
  }

  closeVideoCall();
}

function handleNegotiationNeededEvent() {
  myPeerConnection.createOffer().then(function(offer) {
    return myPeerConnection.setLocalDescription(offer);
  })
  .then(function() {
    sendToServer({
      name: "myUsername",
      target: "targetUsername",
      type: "video-offer",
      sdp: myPeerConnection.localDescription
    });
  })
  .catch(reportError);
}

function sendToServer(msg) {
  var msgJSON = JSON.stringify(msg);

  socket.emit('event',msgJSON);
}

function handleVideoOfferMsg(msg) {
  var localStream = null;

  targetUsername = msg.name;
  createPeerConnection();

  var desc = new RTCSessionDescription(msg.sdp);

  myPeerConnection.setRemoteDescription(desc).then(function () {
    return navigator.mediaDevices.getUserMedia(mediaConstraints);
  })
  .then(function(stream) {
    localStream = stream;
    myVideo.srcObject = localStream;

    localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
  })
  .then(function() {
    return myPeerConnection.createAnswer();
  })
  .then(function(answer) {
    return myPeerConnection.setLocalDescription(answer);
  })
  .then(function() {
    var msg = {
      name: "myUsername",
      target: "targetUsername",
      type: "video-answer",
      sdp: myPeerConnection.localDescription
    };

    sendToServer(msg);
  })
  .catch(handleGetUserMediaError);
}

function handleICECandidateEvent(event) {
  if (event.candidate) {
    sendToServer({
      type: "new-ice-candidate",
      target: "targetUsername",
      candidate: event.candidate
    });
  }
}

function handleNewICECandidateMsg(msg) {
  var candidate = new RTCIceCandidate(msg.candidate);

  myPeerConnection.addIceCandidate(candidate)
    .catch(reportError);
}
function handleTrackEvent(event) {
  const video = document.createElement('video')
  addVideoStream(video,event.streams[0])
}