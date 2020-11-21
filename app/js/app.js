(function() {


	let video = document.querySelector('#webcam');


	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		navigator.mediaDevices.getUserMedia({video: true}).then(function(stream) {
			video.srcObject = stream;
			initialize();
		});
	}


	let AudioContext = (
		window.AudioContext ||
		window.webkitAudioContext ||
		null
	);

	let lastImageData;
	let canvasSource = document.querySelector("#canvas-source");
	let canvasBlended = document.querySelector("#canvas-blended");

	let contextSource = canvasSource.getContext('2d');
	let contextBlended = canvasBlended.getContext('2d');

	let soundContext;
	let bufferLoader;
	let notes = [];

	// mirror video
	contextSource.translate(canvasSource.width, 0);
	contextSource.scale(-1, 1);

	function initialize() {
		setTimeout(loadSounds, 500);
	}

	function loadSounds() {
		soundContext = new AudioContext();
		bufferLoader = new BufferLoader(soundContext,
			[	'sounds/448547__tedagame__c2.ogg',
				'sounds/448600__tedagame__d-2.ogg',
				'sounds/448587__tedagame__f-2.ogg',
				'sounds/448590__tedagame__g-2.ogg',
				'sounds/448571__tedagame__a-2.ogg',
				'sounds/448546__tedagame__c3.ogg',
				'sounds/448608__tedagame__d3.ogg',
				'sounds/448584__tedagame__f-3.ogg',
				'sounds/448593__tedagame__g-3.ogg',
				'sounds/448570__tedagame__a-3.ogg',
				'sounds/448539__tedagame__c-4.ogg',
				'sounds/448602__tedagame__d-4.ogg',
				'sounds/448585__tedagame__f-4.ogg',
				'sounds/448592__tedagame__g-4.ogg',
				'sounds/448577__tedagame__a-4.ogg',
				'sounds/448532__tedagame__c-5.ogg',
				'sounds/448603__tedagame__d-5.ogg',
				'sounds/448582__tedagame__f-5.ogg',
				'sounds/448599__tedagame__g-5.ogg',
				'sounds/448576__tedagame__a-5.ogg'
			],
			finishedLoading
		);
		bufferLoader.load();
	}

	function finishedLoading(bufferList) {

		for (let i=0; i< bufferList.length; i++) {
			let source = soundContext.createBufferSource();
			source.buffer = bufferList[i];
			source.connect(soundContext.destination);
			let note = {
				note: source,
				ready: true,
				visual: "#note" + i
			};

			notes.push(note);
		}
		start();
	}

	function playSound(obj) {
		if (!obj.ready) return;
		let source = soundContext.createBufferSource();
		source.buffer = obj.note.buffer;
		source.connect(soundContext.destination);
		source.start(0);
		obj.ready = false;
		// throttle the note
		setTimeout(setNoteReady, 200, obj);
	}

	function setNoteReady(obj) {
		obj.ready = true;
	}

	function start() {
		canvasSource
		update();
	}

	window.requestAnimFrame = (function(){
		return  window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame ||
			window.mozRequestAnimationFrame    ||
			window.oRequestAnimationFrame      ||
			window.msRequestAnimationFrame     ||
			function( callback ){
				window.setTimeout(callback, 1000 / 60);
			};
	})();

	function update() {
		drawVideo();
		blend();
		checkAreas();
		requestAnimFrame(update);
	}

	function drawVideo() {
		contextSource.drawImage(video, 0, 0, video.width, video.height);
	}

	function blend() {
		let width = canvasSource.width;
		let height = canvasSource.height;
		
		// get webcam image data
		let sourceData = contextSource.getImageData(0, 0, width, height);
		// console.log(sourceData);

		// create an image if the previous image doesn’t exist
		if (!lastImageData) lastImageData = contextSource.getImageData(0, 0, width, height);
		// create a ImageData instance to receive the blended result
		let blendedData = contextSource.createImageData(width, height);
		// blend the 2 images
		differenceAccuracy(blendedData.data, sourceData.data, lastImageData.data);
		// draw the result in a canvas
		contextBlended.putImageData(blendedData, 0, 0);
		// store the current webcam image
		lastImageData = sourceData;
	}

	function fastAbs(value) {
		// funky bitwise, equal Math.abs
		return (value ^ (value >> 31)) - (value >> 31);
	}

	function threshold(value) {
		return (value > 0x15) ? 0xFF : 0;
	}



	function differenceAccuracy(target, data1, data2) {
		let i = 0;
		while (i < (data1.length * 0.25)) {
			let average1 = (data1[4*i] + data1[4*i+1] + data1[4*i+2]) / 3;
			let average2 = (data2[4*i] + data2[4*i+1] + data2[4*i+2]) / 3;
			let diff = threshold(fastAbs(average1 - average2));
			target[4*i] = diff;
			target[4*i+1] = diff;
			target[4*i+2] = diff;
			target[4*i+3] = 0xFF;
			++i;
		}
	}

	function checkAreas() {
		// loop over the note areas
		for (let r=0; r<20; ++r) {
			let blendedData = contextBlended.getImageData(1/20*r*video.width, 280, video.width/20, 50);
			let i = 0;
			let average = 0;
			// loop over the pixels
			while (i < (blendedData.data.length * 0.25)) {
				// make an average between the color channel
				average += (blendedData.data[i*4] + blendedData.data[i*4+1] + blendedData.data[i*4+2]) / 3;
				++i;
			}
			// calculate an average between of the color values of the note area
			average = Math.round(average / (blendedData.data.length * 0.60));
			
			if (average > 60) {
				playSound(notes[r]);
				console.log(average);
			
				if(notes[r]){
					let key=document.querySelector(notes[r].visual)
					let timerId =setTimeout(key.classList.add('active'), 1000)
					setTimeout(() => { clearInterval(timerId); key.classList.remove('active');}, 1000);
				}
			}
		}
	}


})();
