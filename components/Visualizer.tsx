import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  inputVolume: number;
  outputVolume: number;
  isActive: boolean;
}

const Visualizer: React.FC<VisualizerProps> = ({ inputVolume, outputVolume, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let rotation = 0;

    const draw = () => {
      if (!isActive) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Draw idle state
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      ctx.fillStyle = 'rgba(15, 5, 24, 0.2)'; // Fade effect
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const maxRadius = Math.min(centerX, centerY) - 20;

      // Combine volumes for dynamic radius, giving priority to output (Ananya speaking)
      // Smooth the volume visual a bit
      const effectiveVolume = Math.max(inputVolume * 5, outputVolume * 2); 
      const radius = 60 + effectiveVolume * 100;
      
      rotation += 0.02;

      // Draw Ananya's Aura (Outer Ring)
      ctx.beginPath();
      for (let i = 0; i < 360; i += 10) {
        const rad = (i * Math.PI) / 180 + rotation;
        const r = radius + Math.sin(rad * 5) * 10;
        const x = centerX + Math.cos(rad) * r;
        const y = centerY + Math.sin(rad) * r;
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = outputVolume > 0.01 ? '#ff0a78' : '#00f3ff'; // Pink when she speaks, Blue when listening
      ctx.lineWidth = 3;
      ctx.stroke();

      // Draw Inner Core
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = outputVolume > 0.01 ? 'rgba(255, 10, 120, 0.5)' : 'rgba(0, 243, 255, 0.5)';
      ctx.fill();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [inputVolume, outputVolume, isActive]);

  return (
    <canvas 
      ref={canvasRef} 
      width={400} 
      height={400} 
      className="w-full max-w-[400px] h-auto mx-auto"
    />
  );
};

export default Visualizer;