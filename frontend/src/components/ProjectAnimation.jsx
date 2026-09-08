import { useEffect, useRef } from 'react';

export default function ProjectAnimation({ sector }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const animateWaterResources = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Water waves
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.3)';
      ctx.lineWidth = 3;
      
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        for (let x = 0; x < canvas.width; x++) {
          const y = canvas.height / 2 + Math.sin((x + time + i * 100) * 0.01) * 30 + i * 20;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Dam structure (simplified)
      ctx.fillStyle = 'rgba(71, 85, 105, 0.2)';
      ctx.fillRect(canvas.width * 0.7, canvas.height * 0.3, canvas.width * 0.05, canvas.height * 0.5);
      
      // Water droplets
      for (let i = 0; i < 5; i++) {
        const dropX = canvas.width * 0.73 + Math.sin(time * 0.05 + i) * 10;
        const dropY = canvas.height * 0.35 + (time * 2 + i * 50) % (canvas.height * 0.4);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.4)';
        ctx.beginPath();
        ctx.arc(dropX, dropY, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      time += 1;
      animationFrameId = requestAnimationFrame(animateWaterResources);
    };

    const animateRoadsAndHighways = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Road lanes
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([20, 10]);
      
      const roadY = canvas.height / 2;
      ctx.beginPath();
      ctx.moveTo(0, roadY);
      ctx.lineTo(canvas.width, roadY);
      ctx.stroke();
      
      // Moving vehicles
      const carPositions = [
        { x: (time * 3) % canvas.width, y: roadY - 20, color: 'rgba(239, 68, 68, 0.6)' },
        { x: (time * 2 + 100) % canvas.width, y: roadY + 20, color: 'rgba(34, 197, 94, 0.6)' }
      ];
      
      carPositions.forEach(car => {
        ctx.fillStyle = car.color;
        ctx.fillRect(car.x, car.y, 40, 20);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(car.x + 5, car.y + 3, 12, 14);
        ctx.fillRect(car.x + 23, car.y + 3, 12, 14);
      });

      time += 1;
      animationFrameId = requestAnimationFrame(animateRoadsAndHighways);
    };

    const animateRailways = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Railway tracks
      const trackY = canvas.height / 2;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 4;
      
      // Rails
      ctx.beginPath();
      ctx.moveTo(0, trackY - 15);
      ctx.lineTo(canvas.width, trackY - 15);
      ctx.moveTo(0, trackY + 15);
      ctx.lineTo(canvas.width, trackY + 15);
      ctx.stroke();
      
      // Sleepers
      ctx.lineWidth = 2;
      for (let i = 0; i < canvas.width; i += 30) {
        const offset = (time * 2) % 30;
        ctx.beginPath();
        ctx.moveTo(i - offset, trackY - 25);
        ctx.lineTo(i - offset, trackY + 25);
        ctx.stroke();
      }
      
      // Train
      const trainX = (time * 4) % (canvas.width + 200) - 200;
      ctx.fillStyle = 'rgba(139, 92, 246, 0.7)';
      ctx.fillRect(trainX, trackY - 30, 150, 60);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(trainX + 10, trackY - 20, 30, 20);
      ctx.fillRect(trainX + 50, trackY - 20, 30, 20);
      ctx.fillRect(trainX + 90, trackY - 20, 30, 20);

      time += 1;
      animationFrameId = requestAnimationFrame(animateRailways);
    };

    const animatePowerAndEnergy = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Power lines
      ctx.strokeStyle = 'rgba(234, 179, 8, 0.3)';
      ctx.lineWidth = 2;
      
      for (let i = 0; i < 4; i++) {
        const x = (canvas.width / 4) * i + canvas.width / 8;
        ctx.beginPath();
        ctx.moveTo(x, 50);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
        
        // Tower structure
        ctx.beginPath();
        ctx.moveTo(x - 20, 100);
        ctx.lineTo(x, 50);
        ctx.lineTo(x + 20, 100);
        ctx.stroke();
      }
      
      // Electricity flow
      for (let i = 0; i < 4; i++) {
        const x = (canvas.width / 4) * i + canvas.width / 8;
        const pulseY = (time * 5 + i * 50) % canvas.height;
        
        ctx.fillStyle = 'rgba(234, 179, 8, 0.8)';
        ctx.beginPath();
        ctx.arc(x, pulseY, 5, 0, Math.PI * 2);
        ctx.fill();
        
        // Glow effect
        ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
        ctx.beginPath();
        ctx.arc(x, pulseY, 10, 0, Math.PI * 2);
        ctx.fill();
      }

      time += 1;
      animationFrameId = requestAnimationFrame(animatePowerAndEnergy);
    };

    const animateTelecommunication = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Network nodes
      const nodes = [
        { x: canvas.width * 0.2, y: canvas.height * 0.3 },
        { x: canvas.width * 0.8, y: canvas.height * 0.3 },
        { x: canvas.width * 0.5, y: canvas.height * 0.7 },
        { x: canvas.width * 0.3, y: canvas.height * 0.6 },
        { x: canvas.width * 0.7, y: canvas.height * 0.6 }
      ];
      
      // Connections
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.3)';
      ctx.lineWidth = 2;
      nodes.forEach((node1, i) => {
        nodes.forEach((node2, j) => {
          if (i < j) {
            ctx.beginPath();
            ctx.moveTo(node1.x, node1.y);
            ctx.lineTo(node2.x, node2.y);
            ctx.stroke();
          }
        });
      });
      
      // Data packets
      nodes.forEach((node, i) => {
        const angle = (time * 0.05 + i) * Math.PI;
        const radius = 50 + Math.sin(time * 0.02 + i) * 20;
        const packetX = node.x + Math.cos(angle) * radius;
        const packetY = node.y + Math.sin(angle) * radius;
        
        ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
        ctx.beginPath();
        ctx.arc(packetX, packetY, 4, 0, Math.PI * 2);
        ctx.fill();
      });
      
      // Nodes
      nodes.forEach(node => {
        ctx.fillStyle = 'rgba(99, 102, 241, 0.8)';
        ctx.beginPath();
        ctx.arc(node.x, node.y, 8, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulse effect
        const pulseRadius = 8 + Math.sin(time * 0.1) * 5;
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
        ctx.stroke();
      });

      time += 1;
      animationFrameId = requestAnimationFrame(animateTelecommunication);
    };

    const animateDefault = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Construction crane
      const craneX = canvas.width * 0.5;
      const craneBase = canvas.height * 0.8;
      
      // Crane tower
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(craneX, craneBase);
      ctx.lineTo(craneX, craneBase - 150);
      ctx.stroke();
      
      // Crane arm
      const armAngle = Math.sin(time * 0.02) * 0.3;
      const armLength = 120;
      const armEndX = craneX + Math.cos(armAngle) * armLength;
      const armEndY = craneBase - 150 + Math.sin(armAngle) * armLength;
      
      ctx.beginPath();
      ctx.moveTo(craneX, craneBase - 150);
      ctx.lineTo(armEndX, armEndY);
      ctx.stroke();
      
      // Hook
      const hookY = armEndY + (time % 100);
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(armEndX, armEndY);
      ctx.lineTo(armEndX, hookY);
      ctx.stroke();
      
      // Building blocks
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = `rgba(139, 92, 246, ${0.2 + i * 0.1})`;
        ctx.fillRect(craneX - 60, craneBase - 20 - i * 25, 120, 20);
      }

      time += 1;
      animationFrameId = requestAnimationFrame(animateDefault);
    };

    // Select animation based on sector
    const sectorLower = (sector || '').toLowerCase();
    
    if (sectorLower.includes('water') || sectorLower.includes('irrigation')) {
      animateWaterResources();
    } else if (sectorLower.includes('road') || sectorLower.includes('highway')) {
      animateRoadsAndHighways();
    } else if (sectorLower.includes('railway') || sectorLower.includes('rail')) {
      animateRailways();
    } else if (sectorLower.includes('power') || sectorLower.includes('energy') || sectorLower.includes('electricity')) {
      animatePowerAndEnergy();
    } else if (sectorLower.includes('telecom') || sectorLower.includes('communication')) {
      animateTelecommunication();
    } else {
      animateDefault();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [sector]);

  return (
    <canvas
      ref={canvasRef}
      className="panel-background-sim"
      style={{ width: '100%', height: '100%' }}
    />
  );
}
