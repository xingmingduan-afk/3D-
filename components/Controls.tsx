
import React, { useState } from 'react';
import { ParticleConfig, ShapeType } from '../types';
import { analyzeConcept } from '../services/geminiService';

interface ControlsProps {
  config: ParticleConfig;
  setConfig: React.Dispatch<React.SetStateAction<ParticleConfig>>;
  gesturesEnabled: boolean;
  onToggleGestures: () => void;
}

const Controls: React.FC<ControlsProps> = ({ config, setConfig, gesturesEnabled, onToggleGestures }) => {
  const [aiPrompt, setAiPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  const handleShapeChange = (shape: ShapeType) => {
    setConfig(prev => ({ ...prev, shape }));
    setAiMessage(null);
  };

  const handleAISubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    setIsThinking(true);
    setAiMessage(null);

    try {
      const result = await analyzeConcept(aiPrompt);
      setConfig(prev => ({
        ...prev,
        shape: result.shapeMatch,
        color: result.colorHex,
        colorPalette: result.colorPalette,
        speed: result.speed,
        noiseStrength: result.noiseStrength
      }));
      setAiMessage(result.reasoning);
    } catch (error) {
      setAiMessage("Could not connect to AI. Please check API key.");
    } finally {
      setIsThinking(false);
    }
  };

  const updatePaletteColor = (index: number, newColor: string) => {
    const newPalette = [...config.colorPalette];
    newPalette[index] = newColor;
    setConfig({ ...config, colorPalette: newPalette });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="absolute top-0 left-0 h-full w-full pointer-events-none flex flex-col justify-between p-6 z-40">
      
      {/* Panel Container */}
      <div className={`pointer-events-auto w-full max-w-md bg-black/40 backdrop-blur-md rounded-xl border border-white/10 text-white shadow-2xl transition-all duration-300 ease-in-out ${isMinimized ? 'h-auto' : 'overflow-y-auto max-h-[90vh]'}`}>
        
        {/* Header (Always Visible) */}
        <div className="flex justify-between items-center p-6 border-b border-white/5">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Particle Morph AI
          </h1>
          <div className="flex gap-2">
             {/* Minimize Button */}
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Content (Hidden when minimized) */}
        {!isMinimized && (
          <div className="p-6 pt-4">
             
            {/* AI Input */}
            <form onSubmit={handleAISubmit} className="mb-6 relative">
              <label className="block text-xs font-medium text-gray-400 mb-1 uppercase tracking-wider">
                Visualize Concept (AI)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g. 'Cyberpunk forest'"
                  className="flex-1 bg-black/50 border border-white/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={isThinking}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    isThinking 
                      ? 'bg-gray-600 cursor-wait' 
                      : 'bg-blue-600 hover:bg-blue-500 active:scale-95'
                  }`}
                >
                  {isThinking ? '...' : 'Go'}
                </button>
              </div>
              {aiMessage && (
                <div className="mt-2 text-xs text-green-300 italic p-2 bg-green-900/20 rounded border border-green-500/30">
                  ✨ {aiMessage}
                </div>
              )}
            </form>

            {/* Interaction Mode Toggle */}
            <div className="mb-6 p-1 bg-white/5 rounded-lg flex border border-white/10 relative overflow-hidden">
               <div 
                 className={`absolute top-1 bottom-1 w-[48%] bg-blue-600/80 rounded transition-transform duration-300 ease-out ${gesturesEnabled ? 'translate-x-[104%]' : 'translate-x-1'}`} 
               />
               <button 
                 onClick={() => gesturesEnabled && onToggleGestures()}
                 className={`flex-1 relative z-10 py-2 text-xs font-bold uppercase tracking-wider text-center transition-colors ${!gesturesEnabled ? 'text-white' : 'text-gray-400 hover:text-white'}`}
               >
                 🖱️ Mouse Control
               </button>
               <button 
                 onClick={() => !gesturesEnabled && onToggleGestures()}
                 className={`flex-1 relative z-10 py-2 text-xs font-bold uppercase tracking-wider text-center transition-colors ${gesturesEnabled ? 'text-white' : 'text-gray-400 hover:text-white'}`}
               >
                 ✋ Hand Gestures
               </button>
            </div>

            {/* Presets */}
            <div className="mb-6">
              <label className="block text-xs font-medium text-gray-400 mb-2 uppercase tracking-wider">
                Shape Presets
              </label>
              <div className="grid grid-cols-3 gap-2">
                {Object.values(ShapeType).map((shape) => (
                  <button
                    key={shape}
                    onClick={() => handleShapeChange(shape)}
                    className={`px-2 py-2 rounded text-xs font-medium transition-all ${
                      config.shape === shape
                        ? 'bg-white text-black'
                        : 'bg-white/5 hover:bg-white/10 text-gray-300'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders */}
            <div className="space-y-4">
              
              <div>
                <div className="flex justify-between text-xs mb-1 text-gray-400">
                  <span>Particle Size</span>
                  <span>{config.size.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.01"
                  max="0.5"
                  step="0.01"
                  value={config.size}
                  onChange={(e) => setConfig({ ...config, size: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 text-gray-400">
                  <span>Simulation Speed</span>
                  <span>{config.speed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="3"
                  step="0.1"
                  value={config.speed}
                  onChange={(e) => setConfig({ ...config, speed: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1 text-gray-400">
                  <span>Noise / Chaos</span>
                  <span>{config.noiseStrength.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={config.noiseStrength}
                  onChange={(e) => setConfig({ ...config, noiseStrength: parseFloat(e.target.value) })}
                  className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
              </div>
              
              {/* Vertical Gradient Control */}
              <div>
                <div className="flex justify-between text-xs mb-2 text-gray-400">
                  <span>Vertical Gradient (Bottom to Top)</span>
                </div>
                <div className="flex justify-between gap-1 bg-white/5 p-2 rounded-lg">
                  {config.colorPalette.map((color, index) => (
                    <div key={index} className="flex flex-col items-center gap-1 group relative">
                      <div 
                        className="w-8 h-8 rounded border border-white/20 shadow-inner" 
                        style={{backgroundColor: color}}
                      />
                      <input
                        type="color"
                        value={color}
                        onChange={(e) => updatePaletteColor(index, e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title={`Color Step ${index + 1}`}
                      />
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
      
      {/* Footer Area */}
      <div className="pointer-events-none text-right flex flex-col items-end gap-6">
           
           {/* Watermark */}
           <div className="opacity-40 hover:opacity-80 transition-opacity duration-700 select-none pr-2 translate-y-6">
              <h2 className="text-3xl text-white font-bold" style={{fontFamily: "'Microsoft YaHei', sans-serif", textShadow: '0 0 5px rgba(255,255,255,0.3)'}}>
                D
              </h2>
           </div>

           {/* Fullscreen Button */}
           {!isMinimized && (
             <button 
                onClick={toggleFullscreen}
                className="pointer-events-auto bg-white/10 hover:bg-white/20 p-2 rounded-lg backdrop-blur-sm transition-colors text-white/70 text-xs uppercase tracking-wider"
             >
                Toggle Fullscreen
             </button>
           )}
      </div>
    </div>
  );
};

export default Controls;
