<script lang="ts">
	import { onMount } from 'svelte';
	import * as THREE from 'three';
	import { isNullish } from '@dfinity/utils';

	let container: HTMLDivElement;

	const colors = ['#89cee0', '#5dcabf', '#041093', '#010155'];

	const simplex2Dshader = `
// Simplex 2D noise
//
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v){
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
           -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy) );
  vec2 x0 = v -   i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
  + i.x + vec3(0.0, i1.x, 1.0 ));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
    dot(x12.zw,x12.zw)), 0.0);
  m = m*m ;
  m = m*m ;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}`;

	const vertexShader = `varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position, 1.);
}`;

	const fragmentShader = `
  varying vec2 vUv;
  uniform float time;
  uniform float amplitude;
  uniform float frequency;
  uniform float speed;
  uniform vec3 background;
  uniform vec3 colors[4];
  uniform float initialNoisePositions[7];
  uniform float speeds[4];
  uniform float waveHeight;

  ${simplex2Dshader}

  void main() {
    float y = vUv.y;
    float x = vUv.x;

    vec4 finalColor = vec4(background, 1.0);

    for (int i = 0; i < 4; i++) {
      float noise = snoise(vec2(x * frequency, time * speeds[i] + initialNoisePositions[i]));
      float wave = waveHeight * (sin(noise * 3.14) + 1.0) / 2.0;
      float distance = abs(y - wave + .6); // top position
      float alpha = 1.0 - distance * 2.2;
      finalColor = mix(finalColor, vec4(colors[i], 1.0), alpha);
      finalColor.a = 0.2;
    }

    gl_FragColor = finalColor;
  }
`;

	let renderer: THREE.WebGLRenderer;
	let scene: THREE.Scene;
	let camera: THREE.PerspectiveCamera;
	let material: THREE.ShaderMaterial;
	let mesh: THREE.Mesh;

	onMount(() => {
		init();
		return () => {
			// Cleanup
			renderer.dispose();
			scene.remove(mesh);
			material.dispose();
			mesh.geometry.dispose();
		};
	});

	const init = () => {
		scene = new THREE.Scene();
		camera = new THREE.PerspectiveCamera(
			75,
			container.clientWidth / container.clientHeight,
			0.1,
			1000
		);
		renderer = new THREE.WebGLRenderer();
		renderer.setSize(container.clientWidth, container.clientHeight);
		container.appendChild(renderer.domElement);

		material = new THREE.ShaderMaterial({
			uniforms: {
				time: { value: 0.0 },
				frequency: { value: window.innerWidth < 768 ? 0.5 : 1.0 },
				background: { value: new THREE.Color(colors[2]) },
				colors: { value: colors.map((c) => new THREE.Color(c)) },
				initialNoisePositions: { value: colors.map(() => Math.random() * 1000) },
				speeds: { value: colors.map(() => -1 + Math.random() * 2) },
				waveHeight: { value: 0.5 }
			},
			vertexShader,
			fragmentShader
		});

		const geometry = new THREE.PlaneGeometry(2, 2);
		mesh = new THREE.Mesh(geometry, material);
		scene.add(mesh);

		camera.position.z = 5;

		animate();
	};

	const animate = () => {
		requestAnimationFrame(animate);
		material.uniforms.time.value += 0.001;
		renderer.render(scene, camera);
	};

	const handleResize = () => {
		if (isNullish(container)) {
			return;
		}
		renderer.setSize(container.clientWidth, container.clientHeight);
		camera.aspect = container.clientWidth / container.clientHeight;
		camera.updateProjectionMatrix();
	};

	onMount(() => {
		window.addEventListener('resize', handleResize);
		return () => {
			window.removeEventListener('resize', handleResize);
		};
	});
</script>

<div bind:this={container} class="three-background"></div>

<style>
	.three-background {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		background-color: #01016d;
	}
</style>
