'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useLocale } from '@/components/locale-provider';

type Vec = [number, number, number];

/** Exploded-view offsets by node name (names come from the GLB; keep them when the model is updated). */
function movement(name: string): Vec {
  if (name === 'Tampa_frontal') return [-0.105, 0, 0.105];
  if (name === 'Corpo_box') return [0, 0, -0.045];
  if (/^(Painel_solar|Suporte_painel)/.test(name)) return [0, 0.087, -0.02];
  if (/^(Suporte_chuva|FC37|Comparador)/.test(name)) return [0.09, 0.023, 0];
  if (/^(Abrigo_KY|KY013|LED_Corpo|Pino_LED)/.test(name)) return [-0.075, 0.018, 0];
  if (/^(Estaca_protetora|Umidade_solo)/.test(name)) return [0, -0.057, 0];
  if (/^(Bateria_|Berco_|Contato_berco)/.test(name)) return [-0.05, -0.012, 0.065];
  if (/^(MiniBoost|TP4056|Base_alimentacao)/.test(name)) return [0.045, -0.012, 0.062];
  return [0, 0.012, 0.065];
}
const HIDDEN_WHEN_EXPANDED = /^(Solo_ESP32|KY013_ESP32|FC37_Placa|Comparador_ESP32|Solar_TP|Bateria_Protegida|Bateria_Positivo|Bateria_Negativo|MiniBoost_ESP32|LED_Sinal|LED_GND)/;

type Api = { setExpanded: (value: boolean) => void; reset: () => void };

export default function EstacaViewer() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const hostRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<Api | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [expanded, setExpandedState] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let disposed = false;
    let cleanup = () => {};
    const start = () => {
      new GLTFLoader().loadAsync('/estaca/estaca-v6.glb').then((gltf) => {
        if (disposed) return;
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.setAttribute('aria-label', en ? 'Plantaê stake 3D model' : 'Modelo 3D da estaca Plantaê');
        host.append(renderer.domElement);
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(36, 1, 0.01, 10);
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 0.22;
        controls.maxDistance = 1.7;
        const root = gltf.scene;
        const hemi = new THREE.HemisphereLight(0xffffff, 0x57614f, 2.2);
        const light = new THREE.DirectionalLight(0xfff5dd, 2.4);
        light.position.set(-0.7, 1, 1);
        const fill = new THREE.DirectionalLight(0xe6f4ff, 1.4);
        fill.position.set(0.7, 0.5, -0.6);
        scene.add(root, hemi, light, fill);
        const parts: { mesh: THREE.Mesh; origin: THREE.Vector3; offset: THREE.Vector3 }[] = [];
        root.traverse((object) => {
          const mesh = object as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.geometry.computeVertexNormals();
          (mesh.material as THREE.Material & { flatShading?: boolean }).flatShading = true;
          parts.push({ mesh, origin: mesh.position.clone(), offset: new THREE.Vector3(...movement(mesh.name)) });
        });
        let isExpanded = false;
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const reset = () => {
          const aspect = Math.max(camera.aspect, 0.4);
          const scale = Math.max(1, 0.85 / aspect);
          const distance = isExpanded ? 1.28 : 1;
          controls.target.set(isExpanded ? 0.023 : 0.022, 0.055, isExpanded ? 0.046 : 0);
          camera.position.copy(controls.target).add(new THREE.Vector3(0.28, 0.18, 0.56).multiplyScalar(scale * distance));
          controls.update();
        };
        const resize = () => {
          const { width, height } = host.getBoundingClientRect();
          if (!width || !height) return;
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resize();
        reset();
        const observer = new ResizeObserver(resize);
        observer.observe(host);
        apiRef.current = { setExpanded: (value) => { isExpanded = value; reset(); }, reset };
        let progress = 0;
        const tmp = new THREE.Vector3();
        renderer.setAnimationLoop(() => {
          if (!host.clientWidth) return;
          progress = THREE.MathUtils.lerp(progress, Number(isExpanded), reduced ? 1 : 0.105);
          for (const part of parts) {
            part.mesh.position.copy(tmp.copy(part.origin).addScaledVector(part.offset, progress));
            if (HIDDEN_WHEN_EXPANDED.test(part.mesh.name)) part.mesh.visible = progress < 0.12;
          }
          controls.update();
          renderer.render(scene, camera);
        });
        setState('ready');
        cleanup = () => {
          renderer.setAnimationLoop(null);
          observer.disconnect();
          controls.dispose();
          root.traverse((object) => {
            const mesh = object as THREE.Mesh;
            if (!mesh.isMesh) return;
            mesh.geometry.dispose();
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
              for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
              material.dispose();
            }
          });
          renderer.dispose();
          renderer.domElement.remove();
          apiRef.current = null;
        };
      }).catch(() => { if (!disposed) setState('error'); });
    };
    // Lazy: only load the model once the viewer scrolls near the viewport.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { io.disconnect(); start(); }
    }, { rootMargin: '200px' });
    io.observe(host);
    return () => { disposed = true; io.disconnect(); cleanup(); };
  }, [en]);

  const ready = state === 'ready';
  const choose = (value: boolean) => { setExpandedState(value); apiRef.current?.setExpanded(value); };
  const status = state === 'ready' ? 'V6 · 3D INTERATIVO' : state === 'error' ? (en ? 'V6 · IMAGE' : 'V6 · IMAGEM') : (en ? 'LOADING 3D' : 'CARREGANDO 3D');
  const toggle = (active: boolean) => `rounded-md px-3 py-2 text-sm font-bold transition disabled:cursor-wait disabled:opacity-50 ${active ? 'bg-[#203526] text-[#edf4e3]' : 'text-[#314431]'}`;
  return <figure aria-label={en ? 'Stake V6 explorer' : 'Explorador da estaca V6'} className="relative m-0 overflow-hidden rounded-2xl border border-[#879c80] bg-[#e1ead7] text-[#253728]">
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-5 py-4"><b>{en ? 'Plantaê stake' : 'Estaca Plantaê'}</b><span className="text-[0.66rem] font-bold tracking-[0.12em]">{status}</span></div>
    <div className="relative h-[clamp(340px,42vw,465px)] bg-[radial-gradient(ellipse_at_50%_48%,#f1f5e8,#c6d7bc_79%)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {ready ? null : <img src="/estaca/estaca.png" alt={en ? 'Render of stake V6 with solar panel and rain sensor' : 'Render da estaca V6 com painel solar e sensor de chuva'} className="absolute inset-x-0 bottom-1 top-9 m-auto h-[calc(100%-56px)] w-full object-contain mix-blend-multiply" />}
      <div ref={hostRef} className="absolute inset-0 [&_canvas]:block [&_canvas]:h-full [&_canvas]:w-full" />
    </div>
    <div className="flex items-center justify-center gap-2.5 px-3 py-2">
      <div role="group" aria-label={en ? 'View mode' : 'Modo de visualização'} className="flex gap-1 rounded-lg bg-[#c8d5ba] p-1">
        <button type="button" aria-pressed={!expanded} disabled={!ready} onClick={() => choose(false)} className={toggle(!expanded)}>{en ? 'Assemble' : 'Montar'}</button>
        <button type="button" aria-pressed={expanded} disabled={!ready} onClick={() => choose(true)} className={toggle(expanded)}>{en ? 'Explode parts' : 'Expandir peças'}</button>
      </div>
      <button type="button" disabled={!ready} onClick={() => apiRef.current?.reset()} title={en ? 'Reset camera' : 'Restaurar câmera'} aria-label={en ? 'Reset camera' : 'Restaurar câmera'} className="rounded-md border border-[#9aae90] px-3 py-1.5 text-base text-[#314431] disabled:cursor-wait disabled:opacity-50">↺</button>
    </div>
    <figcaption className="px-3 pb-3 text-center text-xs text-[#425846]">{state === 'error' ? (en ? 'The interactive model is unavailable in this browser. The stake render is shown above.' : 'O modelo interativo está indisponível neste navegador. O render da estaca está disponível acima.') : (en ? 'Drag to rotate · Use the wheel or pinch to zoom' : 'Arraste para girar · Use a roda ou a pinça para aproximar')}</figcaption>
  </figure>;
}
