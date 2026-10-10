import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function Brain3D({ activeTag, onTagClick }) {
  const containerRef = useRef(null);
  const [hoveredTag, setHoveredTag] = useState(null);

  // Floating tags based directly on Behance design
  const floatingTags = [
    { id: "depression", text: "Depression", sub: "Overcome dark episodes", top: "18%", left: "8%" },
    { id: "burnout", text: "Emotional Burnout", sub: "Recharge mental stamina", top: "28%", right: "6%" },
    { id: "anxiety", text: "Anxiety & Panic", sub: "Guided somatic relief", top: "68%", left: "12%" },
    { id: "loneliness", text: "Loneliness", sub: "24/7 empathetic ear", top: "72%", right: "10%" },
    { id: "services", text: "High Quality Services", sub: "Licensed Ph.D. psychologists", top: "8%", right: "20%" },
    { id: "free", text: "Overcome it for free now!", sub: "Start instant assessment", top: "84%", left: "38%" }
  ];

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 580;

    // Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020d14, 0.0035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 42);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Group for entire brain system
    const brainGroup = new THREE.Group();
    scene.add(brainGroup);

    // 1. Procedural 3D Brain Point Cloud (Dual Hemispheres)
    const particleCount = 2800;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const scales = new Float32Array(particleCount);

    const colorCyan = new THREE.Color(0x00c0e8);
    const colorDeepCyan = new THREE.Color(0x006e84);
    const colorElectric = new THREE.Color(0x00ffff);
    const colorCore = new THREE.Color(0x0c7287);

    const nodesData = [];

    for (let i = 0; i < particleCount; i++) {
      // Determine hemisphere: left (-1) or right (+1)
      const hemisphere = Math.random() > 0.5 ? 1 : -1;

      // Parametric ellipsoidal brain coordinates with gyri/sulci perturbations
      const u = Math.random() * Math.PI;
      const v = Math.random() * Math.PI * 2;
      const rBase = 11.5 + (Math.random() - 0.5) * 3.5;

      // Brain fold wrinkles
      const folds = Math.sin(u * 8) * Math.cos(v * 8) * 1.3 + Math.sin(u * 14) * 0.8;
      const r = rBase + folds;

      // Ellipsoidal scaling: longer along Z (front to back), wider along X, height along Y
      let x = (r * Math.sin(u) * Math.cos(v) * 1.1 + hemisphere * 3.8);
      let y = r * Math.cos(u) * 0.95;
      let z = r * Math.sin(u) * Math.sin(v) * 1.35;

      // Sagittal gap in center
      if (Math.abs(x) < 1.2) {
        x += (x >= 0 ? 1.4 : -1.4);
      }

      // Brain stem narrowing at bottom rear
      if (y < -5 && z < 2) {
        x *= 0.5;
        z = z * 0.6 - 2;
      }

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      nodesData.push(new THREE.Vector3(x, y, z));

      // Color variation based on depth and position
      const mixRatio = (y + 10) / 20;
      let pCol = colorDeepCyan.clone().lerp(colorCyan, mixRatio);
      if (Math.random() > 0.88) pCol = colorElectric.clone();
      if (Math.random() < 0.2) pCol = colorCore.clone();

      colors[i * 3] = pCol.r;
      colors[i * 3 + 1] = pCol.g;
      colors[i * 3 + 2] = pCol.b;

      scales[i] = Math.random() * 2.2 + 0.8;
    }

    const brainGeometry = new THREE.BufferGeometry();
    brainGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    brainGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    brainGeometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

    // Custom Particle Texture
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255, 255, 255, 1)");
    gradient.addColorStop(0.3, "rgba(0, 192, 232, 0.9)");
    gradient.addColorStop(0.7, "rgba(0, 110, 132, 0.35)");
    gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const particleTexture = new THREE.CanvasTexture(canvas);

    const brainMaterial = new THREE.PointsMaterial({
      size: 1.4,
      map: particleTexture,
      transparent: true,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const brainPoints = new THREE.Points(brainGeometry, brainMaterial);
    brainGroup.add(brainPoints);

    // 2. Synaptic Neural Connections (Network Lines)
    const linePositions = [];
    const maxDistance = 4.2;
    const sampleStep = 6; // Connect subset of nodes for smooth 60fps performance

    for (let i = 0; i < nodesData.length; i += sampleStep) {
      let connections = 0;
      for (let j = i + sampleStep; j < nodesData.length && connections < 3; j += sampleStep) {
        const d = nodesData[i].distanceTo(nodesData[j]);
        if (d < maxDistance) {
          linePositions.push(nodesData[i].x, nodesData[i].y, nodesData[i].z);
          linePositions.push(nodesData[j].x, nodesData[j].y, nodesData[j].z);
          connections++;
        }
      }
    }

    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));

    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x00c0e8,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    brainGroup.add(lines);

    // 3. Traveling Synaptic Action Potential Pulses
    const pulseCount = 45;
    const pulsePositions = new Float32Array(pulseCount * 3);
    const pulseColors = new Float32Array(pulseCount * 3);
    const pulseGeometry = new THREE.BufferGeometry();
    pulseGeometry.setAttribute("position", new THREE.BufferAttribute(pulsePositions, 3));
    pulseGeometry.setAttribute("color", new THREE.BufferAttribute(pulseColors, 3));

    const pulseMaterial = new THREE.PointsMaterial({
      size: 2.8,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const pulsePoints = new THREE.Points(pulseGeometry, pulseMaterial);
    brainGroup.add(pulsePoints);

    const activePulses = [];
    for (let i = 0; i < pulseCount; i++) {
      activePulses.push({
        nodeA: Math.floor(Math.random() * nodesData.length),
        nodeB: Math.floor(Math.random() * nodesData.length),
        progress: Math.random(),
        speed: 0.008 + Math.random() * 0.015
      });
    }

    // 4. Glowing Cybernetic Holographic Outer Rings
    const ringGeo1 = new THREE.TorusGeometry(19, 0.08, 16, 100);
    const ringMat1 = new THREE.MeshBasicMaterial({
      color: 0x00c0e8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    const ring1 = new THREE.Mesh(ringGeo1, ringMat1);
    ring1.rotation.x = Math.PI / 2.3;
    ring1.rotation.y = Math.PI / 8;
    brainGroup.add(ring1);

    const ringGeo2 = new THREE.TorusGeometry(22, 0.05, 16, 120);
    const ringMat2 = new THREE.MeshBasicMaterial({
      color: 0x0c7287,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending
    });
    const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
    ring2.rotation.x = -Math.PI / 3;
    ring2.rotation.z = Math.PI / 6;
    brainGroup.add(ring2);

    // 5. Ambient Quantum Particles Flow
    const ambientCount = 600;
    const ambientPositions = new Float32Array(ambientCount * 3);
    for (let i = 0; i < ambientCount; i++) {
      ambientPositions[i * 3] = (Math.random() - 0.5) * 80;
      ambientPositions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      ambientPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    const ambientGeo = new THREE.BufferGeometry();
    ambientGeo.setAttribute("position", new THREE.BufferAttribute(ambientPositions, 3));
    const ambientMat = new THREE.PointsMaterial({
      size: 1.1,
      color: 0x00c0e8,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ambientPoints = new THREE.Points(ambientGeo, ambientMat);
    scene.add(ambientPoints);

    // Mouse Tracking & Parallax
    let mouseX = 0;
    let mouseY = 0;
    let targetRotationX = 0;
    let targetRotationY = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouseX = x;
      mouseY = y;
      targetRotationY = x * 0.45;
      targetRotationX = -y * 0.35;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 580;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth damped rotation towards target
      brainGroup.rotation.y += (targetRotationY + elapsedTime * 0.12 - brainGroup.rotation.y) * 0.05;
      brainGroup.rotation.x += (targetRotationX + Math.sin(elapsedTime * 0.5) * 0.05 - brainGroup.rotation.x) * 0.05;

      // Breathing scale effect (simulating neural vitality)
      const breathScale = 1 + Math.sin(elapsedTime * 1.8) * 0.025;
      brainPoints.scale.set(breathScale, breathScale, breathScale);
      lines.scale.set(breathScale, breathScale, breathScale);

      // Rotate orbital rings
      ring1.rotation.z += 0.003;
      ring2.rotation.y -= 0.0025;

      // Drift ambient particles
      ambientPoints.rotation.y = elapsedTime * 0.02;
      ambientPoints.rotation.x = Math.sin(elapsedTime * 0.03) * 0.1;

      // Update traveling action potential pulses
      const posAttr = pulseGeometry.attributes.position;
      const colAttr = pulseGeometry.attributes.color;

      for (let i = 0; i < pulseCount; i++) {
        const pulse = activePulses[i];
        pulse.progress += pulse.speed;

        if (pulse.progress >= 1.0) {
          pulse.progress = 0;
          pulse.nodeA = Math.floor(Math.random() * nodesData.length);
          pulse.nodeB = Math.floor(Math.random() * nodesData.length);
        }

        const vA = nodesData[pulse.nodeA];
        const vB = nodesData[pulse.nodeB];

        if (vA && vB) {
          const currentPos = new THREE.Vector3().lerpVectors(vA, vB, pulse.progress);
          posAttr.setXYZ(i, currentPos.x, currentPos.y, currentPos.z);

          // Glowing electric flash at mid-flight
          const intensity = Math.sin(pulse.progress * Math.PI);
          colAttr.setXYZ(i, 0.2 + intensity * 0.8, 0.9 + intensity * 0.1, 1.0);
        }
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }
      scene.clear();
      renderer.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[580px] md:h-[660px] flex items-center justify-center select-none overflow-hidden">
      {/* 3D WebGL Canvas Target */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        style={{ filter: "drop-shadow(0 0 35px rgba(0, 192, 232, 0.25))" }}
      />

      {/* Cybernetic Neural Backdrop Glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(0, 192, 232, 0.15) 0%, rgba(2, 44, 53, 0.08) 45%, transparent 70%)"
        }}
      />

      {/* Floating 3D Interactive Topic Badges directly inspired by Behance */}
      {floatingTags.map((tag) => {
        const isHovered = hoveredTag === tag.id;
        const isActive = activeTag === tag.id;

        return (
          <div
            key={tag.id}
            onClick={() => onTagClick && onTagClick(tag)}
            onMouseEnter={() => setHoveredTag(tag.id)}
            onMouseLeave={() => setHoveredTag(null)}
            style={{
              position: "absolute",
              top: tag.top,
              left: tag.left,
              right: tag.right,
              transform: isHovered ? "scale(1.08) translateY(-4px)" : "scale(1) translateY(0)",
              transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
              zIndex: 10
            }}
            className="cursor-pointer group"
          >
            <div
              className={`px-4 py-2.5 rounded-full flex items-center gap-2.5 backdrop-blur-md border transition-all duration-300 ${
                isActive || isHovered
                  ? "bg-[#004452]/90 border-[#00c0e8] shadow-[0_0_24px_rgba(0,192,232,0.6)]"
                  : "bg-[#022b35]/70 border-[#00c0e8]/30 shadow-[0_4px_20px_rgba(0,0,0,0.5)] hover:border-[#00c0e8]/70"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-[#00c0e8] animate-ping" />
              <div>
                <div className="font-['Orbitron'] text-xs md:text-sm font-semibold tracking-wider text-[#e6faff] flex items-center gap-1.5">
                  {tag.text}
                </div>
                {tag.sub && (
                  <div className="text-[10px] text-[#8a8a8a] hidden sm:block tracking-wide">
                    {tag.sub}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Central Holographic Core Prompt */}
      <div className="pointer-events-none absolute bottom-4 text-center z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#004452]/60 border border-[#00c0e8]/30 backdrop-blur-sm">
          <span className="text-[11px] font-['Orbitron'] tracking-widest text-[#00c0e8] uppercase">
            3D Neural Synapse Engine Active · Parallax Enabled
          </span>
        </div>
      </div>
    </div>
  );
}
