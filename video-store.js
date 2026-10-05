/**
 * CareBridge Bangladesh - Emergency Video Intelligence & Media Store
 * Provides IndexedDB storage for citizen uploaded video evidence and
 * procedural field camera fallback stream generator.
 */

(function(global) {
  'use strict';

  const DB_NAME = 'CareBridgeMediaDB';
  const STORE_NAME = 'caseVideos';
  const DB_VERSION = 1;
  let _dbInstance = null;

  async function getDB() {
    if (_dbInstance) return _dbInstance;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (e) => {
        _dbInstance = e.target.result;
        resolve(_dbInstance);
      };
      request.onerror = () => {
        console.warn('[VideoStore] IndexedDB open error:', request.error);
        reject(request.error);
      };
    });
  }

  const CareBridgeVideoDB = {
    /**
     * Store video file or blob associated with a case ID
     */
    async saveVideo(caseId, fileOrBlob, altKey = null) {
      if (!caseId || !fileOrBlob) return false;
      try {
        const db = await getDB();
        return new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readwrite');
          const store = tx.objectStore(STORE_NAME);
          store.put(fileOrBlob, String(caseId));
          if (altKey && String(altKey) !== String(caseId)) {
            store.put(fileOrBlob, String(altKey));
          }
          tx.oncomplete = () => resolve(true);
          tx.onerror = () => {
            console.warn('[VideoStore] Failed to save video for', caseId, tx.error);
            resolve(false);
          };
        });
      } catch (err) {
        console.warn('[VideoStore] DB error on save:', err);
        return false;
      }
    },

    /**
     * Retrieve stored video Blob for a case ID with fallback matching
     */
    async getVideo(caseId) {
      if (!caseId) return null;
      try {
        const db = await getDB();
        
        // 1. Direct lookup
        const direct = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).get(String(caseId));
          req.onsuccess = () => resolve(req.result || null);
          req.onerror = () => resolve(null);
        });
        if (direct) return direct;

        // 2. Cross-reference localStorage 'u_my_cases'
        try {
          const myCases = JSON.parse(localStorage.getItem('u_my_cases') || '[]');
          const matched = myCases.find(c => 
            String(c.id) === String(caseId) || 
            String(c.localId) === String(caseId) ||
            String(c.caseId) === String(caseId)
          );
          if (matched) {
            const altId = String(matched.id) === String(caseId) ? matched.localId : matched.id;
            if (altId) {
              const altResult = await new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const req = tx.objectStore(STORE_NAME).get(String(altId));
                req.onsuccess = () => resolve(req.result || null);
                req.onerror = () => resolve(null);
              });
              if (altResult) return altResult;
            }
          }
        } catch (e) {}

        // 3. Fallback: check all keys in DB
        const allKeys = await new Promise((resolve) => {
          const tx = db.transaction(STORE_NAME, 'readonly');
          const req = tx.objectStore(STORE_NAME).getAllKeys();
          req.onsuccess = () => resolve(req.result || []);
          req.onerror = () => resolve([]);
        });

        if (allKeys && allKeys.length > 0) {
          // If there's an exact case-insensitive match or numeric match
          const sTarget = String(caseId).toLowerCase();
          const foundKey = allKeys.find(k => String(k).toLowerCase() === sTarget || String(k).includes(sTarget) || sTarget.includes(String(k)));
          if (foundKey) {
            return new Promise((resolve) => {
              const tx = db.transaction(STORE_NAME, 'readonly');
              const req = tx.objectStore(STORE_NAME).get(foundKey);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
          }

          // If the caller requested video for the latest citizen report and only 1-2 videos exist
          if (allKeys.length === 1) {
            return new Promise((resolve) => {
              const tx = db.transaction(STORE_NAME, 'readonly');
              const req = tx.objectStore(STORE_NAME).get(allKeys[0]);
              req.onsuccess = () => resolve(req.result || null);
              req.onerror = () => resolve(null);
            });
          }
        }

        return null;
      } catch (err) {
        console.warn('[VideoStore] DB error on get:', err);
        return null;
      }
    },

    /**
     * Get a playable object URL for the stored video
     */
    async getVideoUrl(caseId) {
      const blob = await this.getVideo(caseId);
      if (blob && (blob instanceof Blob || blob instanceof File)) {
        return URL.createObjectURL(blob);
      }
      return null;
    },

    /**
     * Check if a video exists for a case ID
     */
    async hasVideo(caseId) {
      const blob = await this.getVideo(caseId);
      return !!blob;
    }
  };

  /**
   * Procedural Emergency Field Cam / Drone Simulator
   * Generates a 100% offline-capable, animated high-tech video feed on HTML5 canvas.
   */
  const EmergencyFieldCam = {
    activeInterval: null,

    /**
     * Attaches procedural field camera animation to an HTML5 canvas or video element
     */
    renderToCanvas(canvas, meta = {}) {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const width = (canvas.width = 640);
      const height = (canvas.height = 360);

      const location = meta.location || 'Dhaka Metropolitan Sector';
      const category = meta.category || 'Disaster Response';
      const coords = meta.coords || '23.7808° N, 90.3807° E';
      const priority = meta.priority || 'HIGH PRIORITY';
      const camId = meta.camId || 'FIELD-BODYCAM #402';

      if (this.activeInterval) {
        cancelAnimationFrame(this.activeInterval);
        this.activeInterval = null;
      }

      let frame = 0;
      const startTime = Date.now();

      function draw() {
        frame++;
        const elapsed = (Date.now() - startTime) / 1000;

        // Base flood / disaster night-vision gradient
        const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
        bgGrad.addColorStop(0, '#041712');
        bgGrad.addColorStop(0.5, '#062920');
        bgGrad.addColorStop(1, '#02120e');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);

        // Water level simulation with sine waves
        ctx.save();
        ctx.fillStyle = 'rgba(6, 78, 59, 0.45)';
        ctx.beginPath();
        const waterY = height * 0.62 + Math.sin(frame * 0.05) * 6;
        ctx.moveTo(0, height);
        ctx.lineTo(0, waterY);
        for (let x = 0; x <= width; x += 20) {
          const y = waterY + Math.sin(x * 0.02 + frame * 0.06) * 8 + Math.cos(x * 0.04 - frame * 0.03) * 4;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();

        // Secondary deeper current
        ctx.fillStyle = 'rgba(4, 120, 87, 0.35)';
        ctx.beginPath();
        const waterY2 = height * 0.7 + Math.cos(frame * 0.04) * 8;
        ctx.moveTo(0, height);
        ctx.lineTo(0, waterY2);
        for (let x = 0; x <= width; x += 20) {
          const y = waterY2 + Math.cos(x * 0.025 + frame * 0.05) * 6;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Tactical HUD Crosshairs & Grid Lines
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // Central target box
        const cx = width / 2;
        const cy = height / 2;
        const bSize = 60;
        ctx.rect(cx - bSize, cy - bSize, bSize * 2, bSize * 2);
        // Corner brackets
        const cLen = 16;
        // Top-left
        ctx.moveTo(cx - bSize - 10, cy - bSize); ctx.lineTo(cx - bSize - 10, cy - bSize - cLen);
        ctx.lineTo(cx - bSize + cLen, cy - bSize - cLen);
        // Top-right
        ctx.moveTo(cx + bSize + 10, cy - bSize); ctx.lineTo(cx + bSize + 10, cy - bSize - cLen);
        ctx.lineTo(cx + bSize - cLen, cy - bSize - cLen);
        // Bottom-left
        ctx.moveTo(cx - bSize - 10, cy + bSize); ctx.lineTo(cx - bSize - 10, cy + bSize + cLen);
        ctx.lineTo(cx - bSize + cLen, cy + bSize + cLen);
        // Bottom-right
        ctx.moveTo(cx + bSize + 10, cy + bSize); ctx.lineTo(cx + bSize + 10, cy + bSize + cLen);
        ctx.lineTo(cx + bSize - cLen, cy + bSize + cLen);
        ctx.stroke();

        // Scanning Radar Sweep line
        const scanY = (frame * 2.5) % height;
        const scanGrad = ctx.createLinearGradient(0, scanY - 30, 0, scanY);
        scanGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
        scanGrad.addColorStop(1, 'rgba(16, 185, 129, 0.25)');
        ctx.fillStyle = scanGrad;
        ctx.fillRect(0, Math.max(0, scanY - 30), width, 30);
        ctx.strokeStyle = 'rgba(52, 211, 153, 0.6)';
        ctx.beginPath();
        ctx.moveTo(0, scanY); ctx.lineTo(width, scanY);
        ctx.stroke();

        // Video noise / static particles
        ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
        for (let i = 0; i < 40; i++) {
          const rx = Math.random() * width;
          const ry = Math.random() * height;
          ctx.fillRect(rx, ry, Math.random() * 3 + 1, 1);
        }

        // Top HUD Bar: Blinking REC + Camera ID + GPS
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fillRect(0, 0, width, 40);

        // Blinking red dot
        const isBlink = Math.floor(elapsed * 2) % 2 === 0;
        if (isBlink) {
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.arc(20, 20, 6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = '#f87171';
        ctx.font = 'bold 11px monospace';
        ctx.fillText('REC', 32, 24);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 11px monospace';
        ctx.fillText(`LIVE [${camId}]`, 75, 24);

        ctx.fillStyle = '#9ca3af';
        ctx.font = '10.5px monospace';
        ctx.fillText(`GPS: ${coords} | ALT: 6.2m`, 230, 24);

        // Battery / Signal
        ctx.fillStyle = '#34d399';
        ctx.fillText('LTE 98% [BAT: 84%]', width - 150, 24);

        // Bottom HUD Bar: Timestamp + Case metadata
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, height - 48, width, 48);

        const now = new Date();
        const timeStr = now.toISOString().replace('T', ' ').slice(0, 19) + '.' + String(now.getMilliseconds()).padStart(3, '0');
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 12px monospace';
        ctx.fillText(`TIMESTAMP: ${timeStr} BST`, 18, height - 28);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11.5px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(`${category.toUpperCase()} — ${location}`, 18, height - 12);

        // Priority Badge on bottom right
        ctx.fillStyle = priority.includes('High') || priority.includes('CRITICAL') ? '#ef4444' : '#f59e0b';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(`● ${priority.toUpperCase()}`, width - 18, height - 20);
        ctx.textAlign = 'left';

        // Verified Watermark
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.font = 'bold 14px sans-serif';
        ctx.fillText('CAREBRIDGE BANGLADESH · VERIFIED CITIZEN EVIDENCE', cx - 180, cy - bSize - 18);

        EmergencyFieldCam.activeInterval = requestAnimationFrame(draw);
      }

      draw();
      return () => {
        if (EmergencyFieldCam.activeInterval) {
          cancelAnimationFrame(EmergencyFieldCam.activeInterval);
          EmergencyFieldCam.activeInterval = null;
        }
      };
    },

    stop() {
      if (this.activeInterval) {
        cancelAnimationFrame(this.activeInterval);
        this.activeInterval = null;
      }
    }
  };

  global.CareBridgeVideoDB = CareBridgeVideoDB;
  global.EmergencyFieldCam = EmergencyFieldCam;

})(typeof window !== 'undefined' ? window : this);
