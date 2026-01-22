import React, { useState, useRef, useEffect } from 'react';
import { Download, Upload, X } from 'lucide-react';
import JSZip from 'jszip';

export default function SpriteSlicer() {
  const [image, setImage] = useState(null);
  const [cols, setCols] = useState(4);
  const [rows, setRows] = useState(4);
  const [spriteWidth, setSpriteWidth] = useState(32);
  const [spriteHeight, setSpriteHeight] = useState(32);
  const [baseName, setBaseName] = useState('sprite');
  
  // Primary sprite (top-left)
  const [primary, setPrimary] = useState({ x: 0, y: 0, w: 32, h: 32 });
  // Secondary horizontal (second in row)
  const [secondH, setSecondH] = useState({ x: 40, y: 0 });
  // Secondary vertical (second in col)
  const [secondV, setSecondV] = useState({ x: 0, y: 40 });
  
  const [dragging, setDragging] = useState(null);
  const [resizing, setResizing] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  // Modal state for image setup
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [pendingImage, setPendingImage] = useState(null);
  const [setupCols, setSetupCols] = useState(4);
  const [setupRows, setSetupRows] = useState(4);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Extract base name from filename
      const fileName = file.name.replace(/\.[^/.]+$/, '');
      setBaseName(fileName);
      
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Store the image and show setup modal
          setPendingImage(img);
          setShowSetupModal(true);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSetupConfirm = () => {
    if (!pendingImage) return;
    
    const img = pendingImage;
    const numCols = setupCols;
    const numRows = setupRows;
    
    // Calculate sprite dimensions based on image size and grid
    const calcWidth = Math.floor(img.width / numCols);
    const calcHeight = Math.floor(img.height / numRows);
    
    // Set all the state
    setImage(img);
    setCols(numCols);
    setRows(numRows);
    setSpriteWidth(calcWidth);
    setSpriteHeight(calcHeight);
    
    // Position primary at origin with calculated size
    setPrimary({ x: 0, y: 0, w: calcWidth, h: calcHeight });
    
    // Position secondary markers assuming no gap initially
    // (user can adjust if there are gaps)
    setSecondH({ x: calcWidth, y: 0 });
    setSecondV({ x: 0, y: calcHeight });
    
    // Clean up
    setPendingImage(null);
    setShowSetupModal(false);
  };

  const handleSetupCancel = () => {
    setPendingImage(null);
    setShowSetupModal(false);
  };

  // Calculate spacings
  const hGap = secondH.x - primary.x - primary.w;
  const vGap = secondV.y - primary.y - primary.h;

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    
    const ctx = canvas.getContext('2d');
    canvas.width = image.width;
    canvas.height = image.height;
    
    // Draw image
    ctx.drawImage(image, 0, 0);
    
    // Draw grid overlay
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = primary.x + col * (primary.w + hGap);
        const y = primary.y + row * (primary.h + vGap);
        ctx.strokeRect(x, y, primary.w, primary.h);
      }
    }
    
    // Draw primary sprite (red)
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 3;
    ctx.strokeRect(primary.x, primary.y, primary.w, primary.h);
    
    // Draw resize handle
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(primary.x + primary.w - 8, primary.y + primary.h - 8, 16, 16);
    
    // Draw secondary horizontal (blue)
    ctx.strokeStyle = '#0000ff';
    ctx.strokeRect(secondH.x, secondH.y, primary.w, primary.h);
    ctx.fillRect(secondH.x + primary.w/2 - 4, secondH.y + primary.h/2 - 4, 8, 8);
    
    // Draw secondary vertical (yellow)
    ctx.strokeStyle = '#ffff00';
    ctx.strokeRect(secondV.x, secondV.y, primary.w, primary.h);
    ctx.fillRect(secondV.x + primary.w/2 - 4, secondV.y + primary.h/2 - 4, 8, 8);
  };

  useEffect(() => {
    drawCanvas();
  }, [image, primary, secondH, secondV, cols, rows]);

  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    // Check resize handle first (larger hit area for easier grabbing)
    const handleX = primary.x + primary.w;
    const handleY = primary.y + primary.h;
    if (x >= handleX - 12 && x <= handleX + 8 &&
        y >= handleY - 12 && y <= handleY + 8) {
      setResizing(true);
      return;
    }
    
    // Check primary
    if (x >= primary.x && x < primary.x + primary.w &&
        y >= primary.y && y < primary.y + primary.h) {
      dragOffset.current = { x: x - primary.x, y: y - primary.y };
      setDragging('primary');
      return;
    }
    
    // Check secondH
    if (x >= secondH.x && x < secondH.x + primary.w &&
        y >= secondH.y && y < secondH.y + primary.h) {
      dragOffset.current = { x: x - secondH.x, y: y - secondH.y };
      setDragging('secondH');
      return;
    }
    
    // Check secondV
    if (x >= secondV.x && x < secondV.x + primary.w &&
        y >= secondV.y && y < secondV.y + primary.h) {
      dragOffset.current = { x: x - secondV.x, y: y - secondV.y };
      setDragging('secondV');
      return;
    }
  };

  const handleMouseMove = (e) => {
    if (!dragging && !resizing) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    if (resizing) {
      const newW = Math.max(10, Math.round(x - primary.x));
      const newH = Math.max(10, Math.round(y - primary.y));
      setPrimary(p => ({ ...p, w: newW, h: newH }));
      setSpriteWidth(newW);
      setSpriteHeight(newH);
      // Update secondary boxes to maintain their gaps
      setSecondH(h => ({ ...h, x: primary.x + newW + hGap }));
      setSecondV(v => ({ ...v, y: primary.y + newH + vGap }));
    } else if (dragging === 'primary') {
      const newX = x - dragOffset.current.x;
      const newY = y - dragOffset.current.y;
      const deltaX = newX - primary.x;
      const deltaY = newY - primary.y;
      setPrimary(p => ({ ...p, x: newX, y: newY }));
      // Move secondary boxes along with primary
      setSecondH(h => ({ x: h.x + deltaX, y: newY }));
      setSecondV(v => ({ x: newX, y: v.y + deltaY }));
    } else if (dragging === 'secondH') {
      const newX = x - dragOffset.current.x;
      setSecondH({ x: newX, y: primary.y });
    } else if (dragging === 'secondV') {
      const newY = y - dragOffset.current.y;
      setSecondV({ x: primary.x, y: newY });
    }
  };

  const handleMouseUp = () => {
    setDragging(null);
    setResizing(false);
  };

  const handleExport = async () => {
    if (!image) return;
    
    const zip = new JSZip();
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = primary.w;
    tempCanvas.height = primary.h;
    const ctx = tempCanvas.getContext('2d');
    
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const x = primary.x + col * (primary.w + hGap);
        const y = primary.y + row * (primary.h + vGap);
        
        ctx.clearRect(0, 0, primary.w, primary.h);
        ctx.drawImage(image, x, y, primary.w, primary.h, 0, 0, primary.w, primary.h);
        
        const blob = await new Promise(resolve => tempCanvas.toBlob(resolve));
        zip.file(`${baseName}_${row}_${col}.png`, blob);
      }
    }
    
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseName}_sprites.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      {/* Setup Modal */}
      {showSetupModal && pendingImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Setup Sprite Grid</h2>
              <button
                onClick={handleSetupCancel}
                className="text-gray-400 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>
            
            <p className="text-gray-400 text-sm mb-4">
              Image size: {pendingImage.width} x {pendingImage.height} px
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block mb-1 text-sm">Number of Columns</label>
                <input
                  type="number"
                  value={setupCols}
                  onChange={(e) => setSetupCols(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full bg-gray-700 px-3 py-2 rounded"
                  autoFocus
                />
                <p className="text-gray-500 text-xs mt-1">
                  Sprite width: ~{Math.floor(pendingImage.width / setupCols)}px
                </p>
              </div>
              
              <div>
                <label className="block mb-1 text-sm">Number of Rows</label>
                <input
                  type="number"
                  value={setupRows}
                  onChange={(e) => setSetupRows(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  className="w-full bg-gray-700 px-3 py-2 rounded"
                />
                <p className="text-gray-500 text-xs mt-1">
                  Sprite height: ~{Math.floor(pendingImage.height / setupRows)}px
                </p>
              </div>
              
              <div className="bg-gray-700/50 rounded p-3 text-sm text-gray-300">
                Total sprites: {setupCols * setupRows}
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSetupCancel}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSetupConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Sprite Sheet Slicer</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Controls */}
          <div className="lg:col-span-1 bg-gray-800 p-4 rounded space-y-4">
            <div>
              <label className="block mb-2 text-sm">Upload Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded cursor-pointer"
              >
                <Upload size={20} />
                Choose File
              </label>
            </div>

            <div>
              <label className="block mb-1 text-sm">Base Name</label>
              <input
                type="text"
                value={baseName}
                onChange={(e) => setBaseName(e.target.value)}
                className="w-full bg-gray-700 px-3 py-2 rounded"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm">Columns</label>
              <input
                type="number"
                value={cols}
                onChange={(e) => setCols(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-700 px-3 py-2 rounded"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm">Rows</label>
              <input
                type="number"
                value={rows}
                onChange={(e) => setRows(parseInt(e.target.value) || 1)}
                className="w-full bg-gray-700 px-3 py-2 rounded"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm">Sprite Width</label>
              <input
                type="number"
                value={spriteWidth}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setSpriteWidth(val);
                  setPrimary(p => ({ ...p, w: val }));
                }}
                className="w-full bg-gray-700 px-3 py-2 rounded"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-sm">Sprite Height</label>
              <input
                type="number"
                value={spriteHeight}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setSpriteHeight(val);
                  setPrimary(p => ({ ...p, h: val }));
                }}
                className="w-full bg-gray-700 px-3 py-2 rounded"
              />
            </div>

            <div className="pt-4 border-t border-gray-700 space-y-2 text-sm">
              <p><span className="text-red-500">●</span> Red: Primary (drag/resize)</p>
              <p><span className="text-blue-500">●</span> Blue: Horizontal spacing</p>
              <p><span className="text-yellow-500">●</span> Yellow: Vertical spacing</p>
              <p className="text-gray-400 mt-2">H-Gap: {hGap}px</p>
              <p className="text-gray-400">V-Gap: {vGap}px</p>
            </div>
            
            <button
              onClick={handleExport}
              disabled={!image}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-3 rounded mt-4"
            >
              <Download size={20} />
              Export Sprites
            </button>
          </div>
          
          {/* Canvas */}
          <div className="lg:col-span-3 bg-gray-800 p-4 rounded">
            {image ? (
              <div className="overflow-auto max-h-[80vh]">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  className="border border-gray-600 cursor-move"
                  style={{ maxWidth: '100%', height: 'auto' }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-96 text-gray-500">
                Upload an image to start
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
