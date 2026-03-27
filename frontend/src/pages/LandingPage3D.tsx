import React, { Component, ReactNode, Suspense, useRef, useState } from "react";
import { Canvas, GroupProps, useFrame } from "@react-three/fiber";
import { ContactShadows, Float, OrbitControls, Sparkles, Stars } from "@react-three/drei";
import { motion } from "framer-motion";
import { ArrowRight, Code2 } from "lucide-react";
import { Link } from "react-router-dom";
import * as THREE from "three";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

class WebGLErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("WebGL error caught by boundary:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function CodeBlock(props: GroupProps & { scale?: number }) {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (hovered ? 1.7 : 0.45);
    }
  });

  return (
    <group
      {...props}
      ref={groupRef}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      scale={hovered ? (props.scale || 1) * 1.08 : props.scale || 1}
    >
      <mesh>
        <boxGeometry args={[2.1, 1.4, 0.2]} />
        <meshStandardMaterial color="#111827" roughness={0.35} metalness={0.65} />
      </mesh>
      {[-0.35, 0, 0.35].map((lineY, index) => (
        <mesh key={lineY} position={[-0.15 + index * 0.1, lineY, 0.12]}>
          <boxGeometry args={[1.3 - index * 0.18, 0.1, 0.06]} />
          <meshStandardMaterial color={index === 0 ? "#60a5fa" : "#93c5fd"} emissive={hovered ? "#2563eb" : "#000"} emissiveIntensity={hovered ? 0.4 : 0.1} />
        </mesh>
      ))}
    </group>
  );
}

function NodeRing(props: GroupProps & { scale?: number }) {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.x += delta * 0.35;
      groupRef.current.rotation.y -= delta * 0.7;
      groupRef.current.position.y += Math.sin(state.clock.elapsedTime * 2.2) * 0.004;
    }
  });

  return (
    <group
      {...props}
      ref={groupRef}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      scale={hovered ? (props.scale || 1) * 1.12 : props.scale || 1}
    >
      <mesh>
        <torusGeometry args={[0.95, 0.15, 32, 100]} />
        <meshStandardMaterial color="#0f172a" roughness={0.25} metalness={0.8} />
      </mesh>
      {[0, Math.PI * 0.66, Math.PI * 1.33].map((rotation) => (
        <mesh key={rotation} position={[Math.cos(rotation) * 0.95, Math.sin(rotation) * 0.95, 0]}>
          <sphereGeometry args={[0.18, 24, 24]} />
          <meshStandardMaterial color="#22d3ee" emissive={hovered ? "#06b6d4" : "#000"} emissiveIntensity={hovered ? 0.8 : 0.2} />
        </mesh>
      ))}
    </group>
  );
}

function BracketPair(props: GroupProps & { scale?: number }) {
  const [hovered, setHover] = useState(false);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta;
      groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.8) * 0.14;
    }
  });

  return (
    <group
      {...props}
      ref={groupRef}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
      scale={hovered ? (props.scale || 1) * 1.18 : props.scale || 1}
    >
      {[-0.55, 0.55].map((x, index) => (
        <group key={x} position={[x, 0, 0]} rotation={[0, 0, index === 0 ? 0 : Math.PI]}>
          <mesh position={[0, 0.45, 0]}>
            <boxGeometry args={[0.12, 0.9, 0.1]} />
            <meshStandardMaterial color="#f472b6" emissive={hovered ? "#ec4899" : "#000"} emissiveIntensity={hovered ? 0.6 : 0.15} />
          </mesh>
          <mesh position={[0.18, 0.86, 0]}>
            <boxGeometry args={[0.46, 0.12, 0.1]} />
            <meshStandardMaterial color="#f472b6" emissive={hovered ? "#ec4899" : "#000"} emissiveIntensity={hovered ? 0.6 : 0.15} />
          </mesh>
          <mesh position={[0.18, 0.04, 0]}>
            <boxGeometry args={[0.46, 0.12, 0.1]} />
            <meshStandardMaterial color="#f472b6" emissive={hovered ? "#ec4899" : "#000"} emissiveIntensity={hovered ? 0.6 : 0.15} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function CodingShapes() {
  return (
    <>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1.5}>
        <CodeBlock position={[2, 0, -2]} scale={1.1} rotation={[0.4, -0.3, 0.2]} />
      </Float>
      <Float speed={1.5} rotationIntensity={1} floatIntensity={2}>
        <BracketPair position={[-3, 1, -1]} scale={0.82} rotation={[0.25, 0.5, -0.2]} />
      </Float>
      <Float speed={2.4} rotationIntensity={1.1} floatIntensity={1.7}>
        <NodeRing position={[-1.6, -2, 0]} scale={0.72} rotation={[-0.15, -0.45, 0.1]} />
      </Float>
      <Float speed={1.8} rotationIntensity={2} floatIntensity={1.2}>
        <CodeBlock position={[3, -1.5, -1]} scale={0.58} rotation={[-0.4, -0.75, 0.3]} />
      </Float>
    </>
  );
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} color="#ffffff" />
      <pointLight position={[-10, -10, -5]} intensity={0.55} color="#22d3ee" />
      <CodingShapes />
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <Sparkles count={100} scale={12} size={4} speed={0.4} opacity={0.5} color="#60a5fa" />
      <ContactShadows position={[0, -4, 0]} opacity={0.4} scale={20} blur={2} far={4} color="#000000" />
      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.45} />
    </>
  );
}

export default function LandingPage3D() {
  const { isAuthenticated, token } = useAuth();
  const isLoggedIn = isAuthenticated || Boolean(token);

  return (
    <div className="relative min-h-screen bg-slate-950 text-foreground overflow-hidden">
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        <WebGLErrorBoundary
          fallback={
            <div className="w-full h-full flex items-center justify-center opacity-20">
              <Code2 className="w-32 h-32 text-primary animate-pulse" />
            </div>
          }
        >
          <Canvas camera={{ position: [0, 0, 8], fov: 45 }} gl={{ antialias: true, powerPreference: "high-performance" }}>
            <Suspense fallback={null}>
              <Scene />
            </Suspense>
          </Canvas>
        </WebGLErrorBoundary>
      </div>

      <header className="absolute top-0 w-full z-50 bg-slate-950/20 backdrop-blur-md border-b border-white/10">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/20 p-2 rounded-lg backdrop-blur">
              <Code2 className="w-6 h-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">TrieQuest</span>
          </div>
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link to="/dashboard">
                <Button className="bg-primary/80 hover:bg-primary text-white border-none backdrop-blur">Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" className="text-white hover:text-white/80 hover:bg-white/10">
                    Sign In
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button className="bg-primary hover:bg-primary/90 text-white border-none shadow-lg shadow-primary/20">
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 pointer-events-none">
        <div className="container mx-auto text-center max-w-4xl pointer-events-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="p-8 md:p-12 rounded-3xl bg-slate-900/30 backdrop-blur-xl border border-white/10 shadow-2xl"
          >
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/20 border border-primary/30 backdrop-blur-md">
              <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span className="text-sm font-medium text-white">Built for competitive programmers</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 text-white leading-tight">
              Grind Together,
              <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-cyan-400">
                Rise Together
              </span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
              Share problems across LeetCode, Codeforces, CodeChef, and AtCoder.
              Challenge friends, track your squad's progress, and turn practice into a team sport.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to={isLoggedIn ? "/dashboard" : "/auth"}>
                <Button size="lg" className="h-14 px-8 text-lg rounded-full gap-2 bg-white text-black hover:bg-slate-200 transition-transform hover:scale-105">
                  {isLoggedIn ? "Enter Dashboard" : "Start Solving"} <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
