import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as React from "react";
import * as THREE from "three";

function isWebGLAvailable() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return !!gl;
  } catch {
    return false;
  }
}

type ShaderUniforms = {
  u_time: { value: number };
  u_resolution: { value: THREE.Vector3 };
  u_color: { value: THREE.Vector3 };
};

function parseCssHslTriplet(triplet: string) {
  // Accepts "H S% L%" (or comma separated) from CSS variables.
  const normalized = triplet.replace(/,/g, " ").trim();
  const parts = normalized.split(/\s+/).filter(Boolean);
  const h = Number(parts[0]);
  const s = Number(parts[1]?.replace("%", ""));
  const l = Number(parts[2]?.replace("%", ""));
  if (!Number.isFinite(h) || !Number.isFinite(s) || !Number.isFinite(l)) return null;
  return { h, s, l };
}

function hslToRgb01(h: number, sPct: number, lPct: number) {
  // https://en.wikipedia.org/wiki/HSL_and_HSV#HSL_to_RGB
  const s = sPct / 100;
  const l = lPct / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const hp = ((h % 360) + 360) % 360 / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0,
    g1 = 0,
    b1 = 0;
  if (hp >= 0 && hp < 1) {
    r1 = c;
    g1 = x;
  } else if (hp >= 1 && hp < 2) {
    r1 = x;
    g1 = c;
  } else if (hp >= 2 && hp < 3) {
    g1 = c;
    b1 = x;
  } else if (hp >= 3 && hp < 4) {
    g1 = x;
    b1 = c;
  } else if (hp >= 4 && hp < 5) {
    r1 = x;
    b1 = c;
  } else {
    r1 = c;
    b1 = x;
  }
  const m = l - c / 2;
  return { r: r1 + m, g: g1 + m, b: b1 + m };
}

function readCssHslVar(varName: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!value) return null;
  // var() indirection: "var(--brand-primary-light)" => read that var.
  const varMatch = value.match(/^var\((--[^)]+)\)$/);
  if (varMatch?.[1]) {
    const indirect = getComputedStyle(document.documentElement).getPropertyValue(varMatch[1]).trim();
    return indirect || null;
  }
  return value;
}

interface ShaderPlaneProps {
  uniforms: ShaderUniforms;
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec2 vUv;
  uniform float u_time;
  uniform vec3 u_resolution;
  uniform vec3 u_color;

  vec2 toPolar(vec2 p) {
    float r = length(p);
    float a = atan(p.y, p.x);
    return vec2(r, a);
  }

  void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = 6.0 * ((fragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y);

    vec2 polar = toPolar(p);
    float r = polar.x;
    vec2 i = p;
    float c = 0.0;
    float rot = r + u_time + p.x * 0.100;
    
    for (float n = 0.0; n < 4.0; n++) {
      float rr = r + 0.15 * sin(u_time * 0.7 + float(n) + r * 2.0);
      p *= mat2(
        cos(rot - sin(u_time / 10.0)), sin(rot),
        -sin(cos(rot) - u_time / 10.0), cos(rot)
      ) * -0.25;

      float t = r - u_time / (n + 30.0);
      i -= p + sin(t - i.y) + rr;

      c += 2.2 / length(vec2(
        (sin(i.x + t) / 0.15),
        (cos(i.y + t) / 0.15)
      ));
    }

    c /= 8.0;

    // Use theme-driven base color (coming from CSS tokens)
    vec3 finalColor = u_color * smoothstep(0.0, 1.0, c * 0.6);
    fragColor = vec4(finalColor, 1.0);
  }

  void main() {
    vec4 fragColor;
    vec2 fragCoord = vUv * u_resolution.xy;
    mainImage(fragColor, fragCoord);
    gl_FragColor = fragColor;
  }
`;

function ShaderPlane({ uniforms }: ShaderPlaneProps) {
  const meshRef = React.useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const material = React.useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
      transparent: true,
    });
    // uniforms is stable (passed from parent memo) and we intentionally recreate
    // the material whenever it changes (e.g. theme-driven color).
  }, [uniforms]);

  React.useEffect(() => {
    return () => material.dispose();
  }, [material]);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    material.uniforms.u_time.value = state.clock.elapsedTime * 0.5;
    material.uniforms.u_resolution.value.set(size.width, size.height, 1.0);
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

export function AnimatedShaderBackground({ className }: { className?: string }) {
  const [color, setColor] = React.useState(() => new THREE.Vector3(0.2, 0.7, 0.5));
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    // Se o WebGL não estiver disponível (ou for bloqueado), renderizamos um fallback CSS
    // para evitar tela branca por falha no Canvas.
    setEnabled(isWebGLAvailable());

    // Pull from semantic tokens (no hard-coded brand colors in JSX).
    const triplet = readCssHslVar("--brand-primary-light") ?? readCssHslVar("--primary");
    if (!triplet) return;
    const parsed = parseCssHslTriplet(triplet);
    if (!parsed) return;
    const rgb = hslToRgb01(parsed.h, parsed.s, parsed.l);
    setColor(new THREE.Vector3(rgb.r, rgb.g, rgb.b));
  }, []);

  const uniforms = React.useMemo<ShaderUniforms>(
    () => ({
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector3(1, 1, 1) },
      u_color: { value: color },
    }),
    [color],
  );

  return (
    <div aria-hidden className={className}>
      {enabled ? (
        <Canvas
          orthographic
          camera={{ position: [0, 0, 1], zoom: 1 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          onCreated={() => setEnabled(true)}
          onError={(e) => {
            console.warn("[landing] WebGL/Canvas error; falling back to CSS background", e);
            setEnabled(false);
          }}
        >
          <ShaderPlane uniforms={uniforms} />
        </Canvas>
      ) : (
        <div
          className="h-full w-full"
          style={{
            background:
              "radial-gradient(1200px 800px at 30% 30%, hsl(var(--brand-primary-light) / 0.35), transparent 60%), radial-gradient(900px 700px at 70% 55%, hsl(var(--primary) / 0.35), transparent 55%), linear-gradient(180deg, hsl(var(--background)), hsl(var(--background)))",
          }}
        />
      )}
    </div>
  );
}
