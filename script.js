const COLORS = {
    grey: 'rgb(195, 195, 195)',
    darkGrey: 'rgb(85, 85, 85)',
    yellow: 'rgb(223, 223, 0)',
    orange: 'rgb(234, 145, 0)',
    red: 'rgb(191, 0, 0)',
    white: 'rgb(255, 255, 255)',
    black: 'rgb(0, 0, 0)',
    darkBlue: 'rgb(3, 17, 34)'
};

const state = {
    currentSpeed: 0,
    permittedSpeed: 100,
    targetSpeed: 0,
    distance: 1000,
    maxScale: 400,
    mode: 'FS',
    level: '2',
    status: 'Normal', // Normal, Indication, Warning, Intervention
    trainNumber: '12345'
};

// Recorder State
let isRecording = false;
let isPlaying = false;
let recordingData = [];
let recordStartTime = 0;
let playbackStartTime = 0;
let playbackIndex = 0;
let animationFrameId;

const canvas = document.getElementById('speed-dial');
const ctx = canvas.getContext('2d');
const centerX = 140;
const centerY = 150;
const radius = 130; // Radius for CSG
const dialRadius = 110; // Radius for tick marks

// Elements
const elCurrentSpeed = document.getElementById('val-current-speed');
const elPermittedSpeed = document.getElementById('val-permitted-speed');
const elTargetSpeed = document.getElementById('val-target-speed');
const elDistance = document.getElementById('val-distance');
const elDistanceFill = document.getElementById('distance-fill');
const elDistanceValue = document.getElementById('distance-value');
const elModeIcon = document.getElementById('mode-icon');
const elLevelIcon = document.getElementById('level-icon');
const elC1Icon = document.getElementById('c1-icon');
const elTrainNumber = document.getElementById('lbl-train-number');
const elRecStatus = document.getElementById('rec-status');

// Inputs
const inpTrainNumber = document.getElementById('inp-train-number');
const inpCurrentSpeed = document.getElementById('inp-current-speed');
const inpPermittedSpeed = document.getElementById('inp-permitted-speed');
const inpTargetSpeed = document.getElementById('inp-target-speed');
const inpDistance = document.getElementById('inp-distance');
const selMaxScale = document.getElementById('sel-max-scale');
const selMode = document.getElementById('sel-mode');
const selLevel = document.getElementById('sel-level');
const selStatus = document.getElementById('sel-status');

// Recorder Buttons
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const btnPlay = document.getElementById('btn-play');

// Scenarios Data
const scenarios = {
    normal: {
        currentSpeed: 100,
        permittedSpeed: 120,
        targetSpeed: 0,
        distance: 0,
        mode: 'FS',
        level: '2',
        status: 'Normal'
    },
    approaching: {
        currentSpeed: 90,
        permittedSpeed: 100,
        targetSpeed: 60,
        distance: 500,
        mode: 'FS',
        level: '2',
        status: 'Indication'
    },
    overspeed: {
        currentSpeed: 105,
        permittedSpeed: 100,
        targetSpeed: 0,
        distance: 0,
        mode: 'FS',
        level: '2',
        status: 'Warning'
    },
    intervention: {
        currentSpeed: 115,
        permittedSpeed: 100,
        targetSpeed: 0,
        distance: 0,
        mode: 'FS',
        level: '2',
        status: 'Intervention'
    },
    shunting: {
        currentSpeed: 15,
        permittedSpeed: 40,
        targetSpeed: 0,
        distance: 0,
        mode: 'SH',
        level: '1',
        status: 'Normal'
    },
    onsight: {
        currentSpeed: 20,
        permittedSpeed: 30,
        targetSpeed: 0,
        distance: 0,
        mode: 'OS',
        level: '2',
        status: 'Normal'
    }
};

function init() {
    addEventListeners();
    resize();
    window.addEventListener('resize', resize);
    loop();
}

function addEventListeners() {
    inpCurrentSpeed.addEventListener('input', (e) => {
        state.currentSpeed = parseInt(e.target.value);
        elCurrentSpeed.textContent = state.currentSpeed;
        updateStatusAutomatic();
    });
    inpPermittedSpeed.addEventListener('input', (e) => {
        state.permittedSpeed = parseInt(e.target.value);
        elPermittedSpeed.textContent = state.permittedSpeed;
        updateStatusAutomatic();
    });
    inpTargetSpeed.addEventListener('input', (e) => {
        state.targetSpeed = parseInt(e.target.value);
        elTargetSpeed.textContent = state.targetSpeed;
    });
    inpDistance.addEventListener('input', (e) => {
        state.distance = parseInt(e.target.value);
        elDistance.textContent = state.distance;
    });
    selMaxScale.addEventListener('change', (e) => {
        state.maxScale = parseInt(e.target.value);
    });
    selMode.addEventListener('change', (e) => {
        state.mode = e.target.value;
    });
    selLevel.addEventListener('change', (e) => {
        state.level = e.target.value;
    });
    selStatus.addEventListener('change', (e) => {
        state.status = e.target.value;
    });
    
    inpTrainNumber.addEventListener('input', (e) => {
        state.trainNumber = e.target.value;
        elTrainNumber.textContent = state.trainNumber;
    });

    // Recorder Listeners
    btnRecord.addEventListener('click', startRecording);
    btnStop.addEventListener('click', stopRecording);
    btnPlay.addEventListener('click', startPlayback);

    // Scenario Buttons
    document.querySelectorAll('.scenario-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const key = btn.getAttribute('data-scenario');
            if (scenarios[key]) {
                loadScenario(scenarios[key]);
            }
        });
    });
}

function loadScenario(s) {
    // Update State
    state.currentSpeed = s.currentSpeed;
    state.permittedSpeed = s.permittedSpeed;
    state.targetSpeed = s.targetSpeed;
    state.distance = s.distance;
    state.mode = s.mode;
    state.level = s.level;
    state.status = s.status;

    // Update UI Controls
    inpCurrentSpeed.value = s.currentSpeed;
    elCurrentSpeed.textContent = s.currentSpeed;

    inpPermittedSpeed.value = s.permittedSpeed;
    elPermittedSpeed.textContent = s.permittedSpeed;

    inpTargetSpeed.value = s.targetSpeed;
    elTargetSpeed.textContent = s.targetSpeed;

    inpDistance.value = s.distance;
    elDistance.textContent = s.distance;

    selMode.value = s.mode;
    selLevel.value = s.level;
    selStatus.value = s.status;
}

function updateStatusAutomatic() {
    // Auto-update status based on speed limits if not manually overridden (simplified logic)
    // Priority: Intervention > Warning > Indication > Normal
    
    // This is a "play" tool, so we respect the manual dropdown mostly, 
    // but the prompt says: "If Current Speed > Permitted Speed, needle turns Orange automatically."
    // "If Current Speed > Permitted Speed + 5, it turns Red."
    
    // We will update the state.status based on these rules if they are triggered.
    // Otherwise we keep the user selection (e.g. Indication).
    
    if (state.currentSpeed > state.permittedSpeed + 5) {
        state.status = 'Intervention';
        selStatus.value = 'Intervention';
    } else if (state.currentSpeed > state.permittedSpeed) {
        state.status = 'Warning';
        selStatus.value = 'Warning';
    } else {
        // If we were in Warning/Intervention and dropped back, go to Normal or Indication?
        // Let's default to Normal if we drop back, unless user selected Indication.
        if (state.status === 'Warning' || state.status === 'Intervention') {
            state.status = 'Normal';
            selStatus.value = 'Normal';
        }
    }
}

function resize() {
    const container = document.getElementById('dmi-container');
    const controlPanel = document.getElementById('control-panel');
    
    // Calculate available space
    const padding = 40;
    const controlPanelHeight = controlPanel ? controlPanel.offsetHeight + 40 : 200;
    const availableHeight = window.innerHeight - controlPanelHeight - padding;
    const availableWidth = window.innerWidth - padding;

    // Determine scale to fit in the available space above the control panel
    let scale = Math.min(availableWidth / 640, availableHeight / 480);
    
    // Limit minimum scale to ensure visibility
    if (scale < 0.3) scale = 0.3;

    container.style.transform = `scale(${scale})`;
    
    // Adjust layout space because transform: scale doesn't affect layout flow size
    // The container is 640x480. We need to reduce the space it takes if scaled down.
    const layoutHeight = 480 * scale;
    const heightDiff = layoutHeight - 480;
    container.style.marginBottom = `${heightDiff}px`;
}

function loop() {
    if (isPlaying) {
        updatePlayback();
    } else if (isRecording) {
        recordFrame();
    }

    updateUI();
    draw();
    animationFrameId = requestAnimationFrame(loop);
}

function startRecording() {
    isRecording = true;
    isPlaying = false;
    recordingData = [];
    recordStartTime = Date.now();
    
    btnRecord.disabled = true;
    btnStop.disabled = false;
    btnPlay.disabled = true;
    elRecStatus.textContent = "Recording... 0s";
    
    // Disable inputs during recording? Maybe not, we want to record interactions.
}

function stopRecording() {
    if (isRecording) {
        isRecording = false;
        btnRecord.disabled = false;
        btnStop.disabled = true;
        btnPlay.disabled = false;
        elRecStatus.textContent = `Recorded ${recordingData.length} frames (${(recordingData[recordingData.length-1]?.time / 1000).toFixed(1)}s)`;
    } else if (isPlaying) {
        isPlaying = false;
        btnRecord.disabled = false;
        btnStop.disabled = true;
        btnPlay.disabled = false;
        elRecStatus.textContent = "Playback stopped.";
    }
}

function recordFrame() {
    const now = Date.now();
    const time = now - recordStartTime;
    
    // Deep copy state
    const frameState = JSON.parse(JSON.stringify(state));
    
    recordingData.push({
        time: time,
        state: frameState
    });
    
    elRecStatus.textContent = `Recording... ${(time / 1000).toFixed(1)}s`;
}

function startPlayback() {
    if (recordingData.length === 0) return;
    
    isPlaying = true;
    isRecording = false;
    playbackStartTime = Date.now();
    playbackIndex = 0;
    
    btnRecord.disabled = true;
    btnStop.disabled = false;
    btnPlay.disabled = true;
    elRecStatus.textContent = "Playing... 0s";
}

function updatePlayback() {
    const now = Date.now();
    const time = now - playbackStartTime;
    
    // Find the frame for current time
    // Simple approach: find first frame with t >= time
    // Better: find last frame with t <= time
    
    while (playbackIndex < recordingData.length - 1 && recordingData[playbackIndex + 1].time <= time) {
        playbackIndex++;
    }
    
    const frame = recordingData[playbackIndex];
    
    if (frame) {
        // Restore state
        Object.assign(state, frame.state);
        
        // Update UI controls to match state (so sliders move)
        syncControlsToState();
    }
    
    elRecStatus.textContent = `Playing... ${(time / 1000).toFixed(1)}s / ${(recordingData[recordingData.length-1].time / 1000).toFixed(1)}s`;
    
    // End of playback
    if (playbackIndex >= recordingData.length - 1) {
        stopRecording(); // Re-use stop logic
        elRecStatus.textContent = "Playback finished.";
    }
}

function syncControlsToState() {
    inpCurrentSpeed.value = state.currentSpeed;
    elCurrentSpeed.textContent = state.currentSpeed;
    
    inpPermittedSpeed.value = state.permittedSpeed;
    elPermittedSpeed.textContent = state.permittedSpeed;
    
    inpTargetSpeed.value = state.targetSpeed;
    elTargetSpeed.textContent = state.targetSpeed;
    
    inpDistance.value = state.distance;
    elDistance.textContent = state.distance;
    
    selMode.value = state.mode;
    selLevel.value = state.level;
    selStatus.value = state.status;
    
    inpTrainNumber.value = state.trainNumber;
    elTrainNumber.textContent = state.trainNumber;
}

function updateUI() {
    // Distance Bar
    let heightPct = 0;
    const d = state.distance;
    if (d <= 100) {
        heightPct = (d / 100) * 18;
    } else {
        // Log scale from 100 to 1000 (18% to 100%)
        // log10(100) = 2, log10(1000) = 3
        const logVal = Math.log10(Math.max(d, 100));
        const ratio = (logVal - 2) / (3 - 2); // 0 to 1
        heightPct = 18 + (ratio * 82);
    }
    // Cap at 100%
    heightPct = Math.min(heightPct, 100);
    elDistanceFill.style.height = `${heightPct}%`;
    elDistanceValue.textContent = d;
    
    // Distance Bar Color Logic
    // Usually grey, but yellow if approaching target?
    // Spec says: "Target distance bar shall be dark grey."
    // But if we are in Indication status, does it change?
    // Let's keep it white/grey for now as per basic spec.
    elDistanceFill.style.backgroundColor = COLORS.white;

    // Symbols
    elModeIcon.innerHTML = getModeSVG(state.mode);
    elLevelIcon.innerHTML = getLevelSVG(state.level);
    elC1Icon.innerHTML = getRadioSVG();
}

function getRadioSVG() {
    // Radio connection symbol (Area C1)
    // Simplified "GSM-R" icon
    const commonAttrs = 'viewBox="0 0 50 50" width="100%" height="100%"';
    const fill = 'fill="white"';

    return `
        <svg ${commonAttrs}>
            <path d="M 10 40 L 10 30 L 15 30 L 15 40 Z" ${fill} />
            <path d="M 20 40 L 20 20 L 25 20 L 25 40 Z" ${fill} />
            <path d="M 30 40 L 30 10 L 35 10 L 35 40 Z" ${fill} />
            <path d="M 40 40 L 40 0 L 45 0 L 45 40 Z" ${fill} />
        </svg>`;
}

function getModeSVG(mode) {
    const commonAttrs = 'viewBox="0 0 50 50" width="100%" height="100%"';
    const stroke = 'stroke="white" stroke-width="2" fill="none"';
    const textStyle = 'fill="white" font-family="sans-serif" text-anchor="middle"';

    switch (mode) {
        case 'OS': // On Sight - The "Eye"
            return `
                <svg ${commonAttrs}>
                    <path d="M 2 25 Q 25 0 48 25 Q 25 50 2 25 Z" ${stroke} />
                    <circle cx="25" cy="25" r="8" fill="white" />
                </svg>`;
        case 'SH': // Shunting
            return `
                <svg ${commonAttrs}>
                    <rect x="5" y="10" width="40" height="30" ${stroke} />
                    <text x="25" y="32" ${textStyle} font-size="20" font-weight="bold">SH</text>
                </svg>`;
        case 'FS': // Full Supervision
            return `
                <svg ${commonAttrs}>
                    <rect x="5" y="5" width="40" height="40" ${stroke} />
                    <text x="25" y="32" ${textStyle} font-size="20" font-weight="bold">FS</text>
                </svg>`;
        case 'SR': // Staff Responsible
            return `
                <svg ${commonAttrs}>
                    <circle cx="25" cy="25" r="20" ${stroke} />
                    <text x="25" y="32" ${textStyle} font-size="20" font-weight="bold">SR</text>
                </svg>`;
        default:
            return `
                <svg ${commonAttrs}>
                    <text x="25" y="32" ${textStyle} font-size="16">${mode}</text>
                </svg>`;
    }
}

function getLevelSVG(level) {
    const commonAttrs = 'viewBox="0 0 50 50" width="100%" height="100%"';
    const stroke = 'stroke="white" stroke-width="2" fill="none"';
    const textStyle = 'fill="white" font-family="sans-serif" text-anchor="middle"';
    
    let label = level;
    if (level === 'NTC') label = 'NTC';
    
    return `
        <svg ${commonAttrs}>
            <rect x="5" y="5" width="40" height="40" ${stroke} />
            <text x="25" y="35" ${textStyle} font-size="24" font-weight="bold">${label}</text>
        </svg>`;
}

function degToRad(deg) {
    return (deg - 90) * (Math.PI / 180); // Canvas 0 is 3 o'clock (0 deg), we want 12 o'clock to be -90 or 270.
    // Wait, standard math: 0 is East.
    // Prompt: 0 km/h is -144 deg (7 o'clock). 12 o'clock is 0 deg.
    // So the prompt uses "0 deg = 12 o'clock".
    // Canvas uses "0 rad = 3 o'clock".
    // So Canvas Angle = Prompt Angle - 90 degrees.
}

function getAngleForSpeed(speed) {
    const maxAngle = 144;
    const minAngle = -144;
    const totalAngle = maxAngle - minAngle;
    const ratio = speed / state.maxScale;
    const promptAngle = minAngle + (ratio * totalAngle);
    return degToRad(promptAngle);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Draw Dial Ticks
    drawTicks();

    // 2. Draw CSG (Circular Speed Gauge)
    drawCSG();

    // 3. Draw Needle
    drawNeedle();
}

function drawTicks() {
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    
    const max = state.maxScale;
    let tickStep = 20;
    if (max <= 140) tickStep = 10;
    else if (max <= 250) tickStep = 20;
    else tickStep = 50;

    for (let s = 0; s <= max; s += tickStep) {
        const angle = getAngleForSpeed(s);
        const innerR = dialRadius - 10;
        const outerR = dialRadius;
        
        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = centerY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = centerY + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Draw numbers for major ticks
        // Only draw numbers for 0, 20, 40... or appropriate steps
        if (s % (tickStep * 2) === 0 || s === max) {
             const textR = dialRadius - 25;
             const tx = centerX + Math.cos(angle) * textR;
             const ty = centerY + Math.sin(angle) * textR;
             
             ctx.fillStyle = COLORS.white;
             ctx.font = '12px sans-serif';
             ctx.textAlign = 'center';
             ctx.textBaseline = 'middle';
             ctx.fillText(s.toString(), tx, ty);
        }
    }
}

function drawCSG() {
    const csgRadius = radius;
    const lineWidth = 15;
    ctx.lineWidth = lineWidth;

    // Zero Zone: -149 to -144 (Prompt degrees)
    drawArc(degToRad(-149), degToRad(-144), COLORS.darkGrey);

    // Permitted Zone: 0 to PermittedSpeed
    let greyEndSpeed = state.permittedSpeed;
    if (state.status === 'Indication') {
        greyEndSpeed = state.targetSpeed;
    }

    // Draw Grey Zone (0 to greyEndSpeed)
    if (greyEndSpeed > 0) {
        drawArc(getAngleForSpeed(0), getAngleForSpeed(greyEndSpeed), COLORS.darkGrey);
    }

    // Draw Yellow Zone (Target to Permitted) if Indication
    if (state.status === 'Indication' && state.permittedSpeed > state.targetSpeed) {
        drawArc(getAngleForSpeed(state.targetSpeed), getAngleForSpeed(state.permittedSpeed), COLORS.yellow);
    }

    // Warning/Overspeed: Permitted to Max (Orange)
    // Intervention: Permitted+5 to Max (Red)
    const interventionSpeed = state.permittedSpeed + 5;
    const maxS = state.maxScale;

    // Orange Zone
    let orangeEnd = maxS;
    if (interventionSpeed < maxS) {
        orangeEnd = interventionSpeed;
    }
    if (state.permittedSpeed < maxS) {
        drawArc(getAngleForSpeed(state.permittedSpeed), getAngleForSpeed(orangeEnd), COLORS.orange);
    }

    // Red Zone
    if (interventionSpeed < maxS) {
        drawArc(getAngleForSpeed(interventionSpeed), getAngleForSpeed(maxS), COLORS.red);
    }

    // Hook at Permitted Speed
    drawHook(state.permittedSpeed);
}

function drawArc(startRad, endRad, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.arc(centerX, centerY, radius, startRad, endRad);
    ctx.stroke();
}

function drawHook(speed) {
    const angle = getAngleForSpeed(speed);
    const hookLen = 20;
    
    const x1 = centerX + Math.cos(angle) * radius;
    const y1 = centerY + Math.sin(angle) * radius;
    const x2 = centerX + Math.cos(angle) * (radius - hookLen);
    const y2 = centerY + Math.sin(angle) * (radius - hookLen);

    ctx.beginPath();
    ctx.strokeStyle = COLORS.white; // Hook is white
    ctx.lineWidth = 4;
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    // Add a small perpendicular line at the end to make it a "Hook"
    // Perpendicular vector: (-dy, dx)
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    const perpX = -dy / len * 5; // 5px width
    const perpY = dx / len * 5;
    
    // Draw the hook "bar" at the inner end
    ctx.moveTo(x2 - perpX, y2 - perpY);
    ctx.lineTo(x2 + perpX, y2 + perpY);
    
    ctx.stroke();
}

function drawNeedle() {
    const angle = getAngleForSpeed(state.currentSpeed);
    const needleLen = 100;
    
    // Color Logic
    let color = COLORS.grey;
    let textColor = COLORS.black;
    
    if (state.status === 'Indication') {
        color = COLORS.yellow;
    } else if (state.status === 'Warning') {
        color = COLORS.orange;
    } else if (state.status === 'Intervention') {
        color = COLORS.red;
        textColor = COLORS.white;
    }

    // Draw Needle Line
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle); 

    ctx.beginPath();
    ctx.fillStyle = color;
    // Tapered needle shape
    ctx.moveTo(0, -6);
    ctx.lineTo(needleLen, 0);
    ctx.lineTo(0, 6);
    ctx.fill();

    // Center Circle
    ctx.beginPath();
    ctx.arc(0, 0, 28, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Digital Speed
    ctx.rotate(-angle); // Rotate back for text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(state.currentSpeed), 0, 1); // Slight offset for visual center

    ctx.restore();
}

init();
