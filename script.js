AFRAME.registerShader('amorphous-gradient', {
    schema: {
        color: { type: 'color', is: 'uniform' },
        timeMsec: { type: 'time', is: 'uniform' }
    },
  
    vertexShader: `
        varying vec2 vUv;
  
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        varying vec2 vUv;
        uniform vec3 color;
        uniform float timeMsec; // A-Frame time in milliseconds.
  
        void main() {
            float time = timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
  
            // Create an amorphous movement effect with increased frequency
            float frequency = 10.0; // Increased frequency for smaller splotches
            float xOffset = sin(vUv.x * frequency + time * 1.2) * 0.5; // Smaller offset
            float yOffset = cos(vUv.y * frequency + time * 1.2) * 0.5; // Smaller offset
  
            // Calculate the gradient color based on UV coordinates and offsets
            vec2 uv = vUv + vec2(xOffset, yOffset);
            vec3 gradientColor = mix(
                vec3(0.0, 0.0, 0.0), // Black
                vec3(0.35, 0.13, 0.2), // Color 1
                uv.y * 0.35 + 0.35
            );
            gradientColor = mix(
                gradientColor,
                vec3(0.2, 0.13, 0.35), // Color 2
                uv.x * 0.35 + 0.35
            );
  
            // Set the final color with oscillation
            gl_FragColor = vec4(gradientColor * (0.5 + 0.5 * sin(time * 0.9)), 1.0);
        }
    `
  });

AFRAME.registerShader('grid-glitch', {
  schema: {
      color: { type: 'color', is: 'uniform' },
      timeMsec: { type: 'time', is: 'uniform' }
  },

  vertexShader: `
      varying vec2 vUv;

      void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
  `,
  fragmentShader: `
      varying vec2 vUv;
      uniform vec3 color;
      uniform float timeMsec; // A-Frame time in milliseconds.

      void main() {
          float time = timeMsec / 1000.0; // Convert from A-Frame milliseconds to typical time in seconds.
          gl_FragColor = mix(
              vec4(mod(vUv, 0.05) * 20.0, 1.0, 1.0),
              vec4(color, 1.0),
              sin(time)
          );
      }
  `
});

AFRAME.registerShader('glowing-gradient', {
    schema: {
      timeMsec: { type: 'time', is: 'uniform' }
    },
  
    vertexShader: `
      varying vec2 vUv;
  
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    
    fragmentShader: `
      varying vec2 vUv;
      uniform float timeMsec; // A-Frame time in milliseconds.
  
      void main() {
        float time = timeMsec / 1000.0; // Convert from A-Frame milliseconds to seconds.
        
        // Define vibrant colors
        vec3 color3 = vec3(1.0, 0.0, 0.5); // Bright pink
        vec3 color2 = vec3(0.0, 0.5, 1.0); // Bright cyan
        vec3 color1 = vec3(0.5, 1.0, 0.0); // Bright green
  
        // Calculate oscillation based on UV coordinates and time
        float oscillation = sin(vUv.x * 10.0 + time) * 0.5 + 0.5; // Oscillation for color blending
        float gradient = smoothstep(0.0, 1.0, vUv.y + oscillation * 0.1); // Smooth transition in Y direction
  
        // Mix colors for a vibrant gradient
        vec3 color = mix(mix(color1, color2, gradient), color3, oscillation);
        
        // Oscillate towards white
        vec3 white = vec3(0.95, 0.8, 1.0);
        vec3 finalColor = mix(color, white, 0.5 * (1.0 + sin(time * 1.0))); // Oscillate towards white
        
        gl_FragColor = vec4(finalColor, 1.0); // Set the final color
      }
    `
  });
  
  

// Microphone audio visualization code
const particleSystem = document.createElement('a-entity');
particleSystem.setAttribute('id', 'particleSystem');
document.querySelector('a-scene').appendChild(particleSystem);

const simplex = new SimplexNoise();
const numParticles = 2500;
const particles = [];
const audioData = new Uint8Array(256);
let normalizedValue = 0;

const MAX_POSITION = 800; // Maximum distance from the origin

// Create particles and set initial positions
for (let i = 0; i < numParticles; i++) {
  const particle = document.createElement('a-sphere');
  particle.setAttribute('radius', 0.2);
  particle.setAttribute('color', `#${Math.floor(Math.random() * 16777215).toString(16)}`);
  particle.setAttribute('material', "shader:glowing-gradient; color: white;");

  // Set an initial position based on noise
  const initialX = simplex.noise2D(i * 0.4, 0) * 100;
  const initialY = simplex.noise2D(i * 0.4 + 1000, 0) * 100;
  const initialZ = simplex.noise2D(i * 0.4 + 2000, 0) * 100;

  particle.setAttribute('position', `${initialX} ${initialY} ${initialZ}`);
  particles.push(particle);
  particleSystem.appendChild(particle);
}

// Set up audio context and microphone
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(stream => {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const microphone = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      microphone.connect(analyser);
      analyser.fftSize = 256;

      function update() {
          analyser.getByteFrequencyData(audioData);
          const avg = audioData.reduce((sum, value) => sum + value, 0) / audioData.length;
          normalizedValue = Math.min(avg / 255, 1); // Scale to 0-1

          // Update sphere size based on audio level
          const sphere = document.getElementById('audioSphere');
          sphere.setAttribute('radius', 100); // Change size based on audio level
          sphere.setAttribute('material', "shader:amorphous-gradient; color: white; side: back;");

          const fogColor = `rgba(255, 255, 255, ${normalizedValue * 0.5})`; // Adjust alpha based on audio
          const fog = document.querySelector('a-scene');
          fog.setAttribute('fog', `type: linear; color: ${fogColor}; near: 1; far: ${100 + (normalizedValue * 200)}`); // Dynamic fog
      

          // Update particle positions based on noise and audio
          particles.forEach((particle, index) => {
              const time = Date.now() * 0.001; // Time factor
              const frequency = 0.005;
              const xNoise = simplex.noise2D(index * frequency, time);
              const yNoise = simplex.noise2D(index * frequency + 1000, time);
              const zNoise = simplex.noise2D(index * frequency + 2000, time);

              const audioInfluence = normalizedValue * 5.0; // Reduced scale for audio influence
              const noiseInfluence = 0.05; // Reduced scale for noise influence

              particle.setAttribute('radius', 0.4 * audioInfluence);

              const currentPos = particle.getAttribute('position');
              const x = Math.max(-MAX_POSITION, Math.min(MAX_POSITION, xNoise * audioInfluence + currentPos.x));
              const y = Math.max(-MAX_POSITION, Math.min(MAX_POSITION, yNoise * audioInfluence + currentPos.y));
              const z = Math.max(-MAX_POSITION, Math.min(MAX_POSITION, zNoise * audioInfluence + currentPos.z));

              particle.setAttribute('position', `${x} ${y} ${z}`);
          });

          requestAnimationFrame(update);
      }
      update(); // Start updating the visualization
  })
  .catch(err => {
      console.error('Error accessing the microphone:', err);
  });

 