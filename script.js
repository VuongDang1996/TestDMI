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
    permittedSpeed: 60,
    targetSpeed: 0,
    distance: 1000,
    maxScale: 250,
    mode: 'FS',
    level: '2',
    status: 'Normal', // Normal, Indication, Warning, Intervention
    trainNumber: '12345',
    driverID: '1234',
    releaseSpeed: 30, // Default release speed
    trackConditions: [] // Array of active track conditions
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
// const elCurrentSpeed = document.getElementById('val-current-speed'); // Removed
// const elPermittedSpeed = document.getElementById('val-permitted-speed'); // Removed
// const elTargetSpeed = document.getElementById('val-target-speed'); // Removed
// const elDistance = document.getElementById('val-distance'); // Removed
const elDistanceFill = document.getElementById('distance-fill');
const elDistanceValue = document.getElementById('distance-value');
const elModeIcon = document.getElementById('mode-icon');
const elLevelIcon = document.getElementById('level-icon');
const elRadioIcon = document.getElementById('radio-icon');
const elBrakeIcon = document.getElementById('brake-icon');
const elB6Area = document.getElementById('b6-area');
const elA1Area = document.getElementById('area-a1');
const elB3Area = document.getElementById('b3-area');
const elB4Area = document.getElementById('b4-area');
const elB5Area = document.getElementById('b5-area');
const elDriverID = document.getElementById('driver-id');
const elTrainNumber = document.getElementById('lbl-train-number');

// Values Table Elements
const elValVTrain = document.getElementById('val-v-train');
const elValVPerm = document.getElementById('val-v-perm');
const elValVTarget = document.getElementById('val-v-target');
const elValVWarn = document.getElementById('val-v-warn');
const elValVInt = document.getElementById('val-v-int');
const elValDistance = document.getElementById('val-distance');
const elValStatus = document.getElementById('val-status');
const elValMode = document.getElementById('val-mode');
const elValLevel = document.getElementById('val-level');
const elRecStatus = document.getElementById('rec-status');
const elSimBackground = document.getElementById('sim-background');
const elSimSpeedOverlay = document.getElementById('sim-speed-overlay');
const elWheels = document.querySelectorAll('.wheel'); // This will now find the wheels
const elSimTrain = document.getElementById('sim-train'); // Add reference if needed

// Inputs
const inpTrainNumber = document.getElementById('inp-train-number');
const inpCurrentSpeed = document.getElementById('inp-current-speed');
const numCurrentSpeed = document.getElementById('num-current-speed');
const inpPermittedSpeed = document.getElementById('inp-permitted-speed');
const numPermittedSpeed = document.getElementById('num-permitted-speed');
const inpTargetSpeed = document.getElementById('inp-target-speed');
const numTargetSpeed = document.getElementById('num-target-speed');
const inpDistance = document.getElementById('inp-distance');
const numDistance = document.getElementById('num-distance');
const selMaxScale = document.getElementById('sel-max-scale');
const selMode = document.getElementById('sel-mode');
const selLevel = document.getElementById('sel-level');
const selStatus = document.getElementById('sel-status');

// Recorder Buttons
const btnRecord = document.getElementById('btn-record');
const btnStop = document.getElementById('btn-stop');
const btnPlay = document.getElementById('btn-play');

// Toolbar Buttons
const btnToggleControls = document.getElementById('btn-toggle-controls');
const btnToggleLearning = document.getElementById('btn-toggle-learning');
const btnToggleSound = document.getElementById('btn-toggle-sound');
const btnCloseControls = document.getElementById('btn-close-controls');
const panelWrapper = document.getElementById('control-panel-wrapper');
const tooltip = document.getElementById('learning-tooltip');
const tooltipTitle = document.getElementById('tooltip-title');
const tooltipDesc = document.getElementById('tooltip-desc');

let isLearningMode = false;
let isSoundEnabled = false;
let audioCtx = null;

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
        currentSpeed: 110,
        permittedSpeed: 120,
        targetSpeed: 60,
        distance: 2500, // Start far out to see the approach
        mode: 'FS',
        level: '2',
        status: 'Normal' // Will auto-switch to Indication as we get closer/slower
    },
    overspeed: {
        currentSpeed: 125, // Just above 120
        permittedSpeed: 120,
        targetSpeed: 0,
        distance: 0,
        mode: 'FS',
        level: '2',
        status: 'Warning' // Will be confirmed by auto-logic
    },
    intervention: {
        currentSpeed: 135, // Well above 120
        permittedSpeed: 120,
        targetSpeed: 0,
        distance: 0,
        mode: 'FS',
        level: '2',
        status: 'Intervention' // Will be confirmed by auto-logic
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
    },
    trip: {
        currentSpeed: 0,
        permittedSpeed: 0,
        targetSpeed: 0,
        distance: 0,
        mode: 'TR',
        level: '2',
        status: 'Intervention'
    }
};

function init() {
    addEventListeners();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('keydown', handleKeyboard);
    requestAnimationFrame(loop);
}

function addEventListeners() {
    // Sync Range and Number Inputs
    syncInputs(inpCurrentSpeed, numCurrentSpeed, 'currentSpeed', true);
    syncInputs(inpPermittedSpeed, numPermittedSpeed, 'permittedSpeed', true);
    syncInputs(inpTargetSpeed, numTargetSpeed, 'targetSpeed');
    syncInputs(inpDistance, numDistance, 'distance');

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

    // Toolbar Listeners
    btnToggleControls.addEventListener('click', toggleControls);
    btnCloseControls.addEventListener('click', toggleControls);
    btnToggleLearning.addEventListener('click', toggleLearningMode);
    btnToggleSound.addEventListener('click', toggleSound);

    // Learning Mode Hover
    document.querySelectorAll('.dmi-area').forEach(area => {
        area.addEventListener('mousemove', (e) => {
            if (!isLearningMode) return;
            showTooltip(e, area.dataset.title, area.dataset.desc, area.id);
        });
        area.addEventListener('mouseleave', () => {
            if (!isLearningMode) return;
            hideTooltip();
        });
    });

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

function syncInputs(range, number, stateKey, autoUpdateStatus = false) {
    range.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        number.value = val;
        state[stateKey] = val;
        
        if (autoUpdateStatus) updateStatusAutomatic();
    });

    number.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        range.value = val;
        state[stateKey] = val;

        if (autoUpdateStatus) updateStatusAutomatic();
    });
}

function handleKeyboard(e) {
    // Ignore if typing in an input
    if (e.target.tagName === 'INPUT') return;

    switch(e.key) {
        case 'ArrowUp':
            state.currentSpeed = Math.min(state.currentSpeed + 1, 400);
            updateInputDisplay();
            updateStatusAutomatic();
            break;
        case 'ArrowDown':
            state.currentSpeed = Math.max(state.currentSpeed - 1, 0);
            updateInputDisplay();
            updateStatusAutomatic();
            break;
        case ' ': // Spacebar
            e.preventDefault();
            state.currentSpeed = 0;
            updateInputDisplay();
            updateStatusAutomatic();
            break;
        case 'm':
        case 'M':
            cycleMode();
            break;
    }
}

function updateInputDisplay() {
    inpCurrentSpeed.value = state.currentSpeed;
    numCurrentSpeed.value = state.currentSpeed;
}

function cycleMode() {
    const modes = ['FS', 'OS', 'SH', 'SR', 'UN', 'NL', 'SB', 'TR', 'PT', 'SF'];
    let idx = modes.indexOf(state.mode);
    idx = (idx + 1) % modes.length;
    state.mode = modes[idx];
    selMode.value = state.mode;
}

function toggleControls() {
    panelWrapper.classList.toggle('panel-hidden');
    // Wait for transition or just resize immediately
    setTimeout(resize, 350); // Match CSS transition time roughly
}

function toggleLearningMode() {
    isLearningMode = !isLearningMode;
    document.body.classList.toggle('learning-mode');
    btnToggleLearning.classList.toggle('active');
}

function getLearningInfo(elementId) {
    const s = state;
    let title = '';
    let desc = '';
    let logic = '';

    switch (elementId) {
        case 'area-a':
            title = 'Area A: Distance to Target';
            desc = `Current Distance: <strong>${Math.floor(s.distance)} m</strong>`;
            logic = `
                <br><strong>Logic:</strong><br>
                - 0-100m: Linear Scale (Precise stopping)<br>
                - 100-1000m: Logarithmic Scale (Overview)<br>
                - Bar fills up as you get closer.
            `;
            if (s.status === 'Indication') {
                logic += `<br>- <span style="color: yellow;">Yellow</span>: Approaching target speed.`;
            }
            if (s.distance < 2000 && s.targetSpeed > 0 && s.targetSpeed < s.permittedSpeed) {
                 logic += `<br>- <strong>TSM Active:</strong> Distance < 2000m`;
            }
            break;

        case 'area-b':
            title = 'Area B: Speed & Supervision';
            desc = `
                Current Speed: <strong>${Math.floor(s.currentSpeed)} km/h</strong><br>
                Permitted Speed: <strong>${s.permittedSpeed} km/h</strong><br>
                Target Speed: <strong>${s.targetSpeed} km/h</strong>
            `;
            
            let color = 'Grey';
            let reason = 'Speed <= Permitted';
            
            if (s.status === 'Intervention') {
                color = '<span style="color: red;">Red</span>';
                reason = `Speed > Permitted + 10 (${s.permittedSpeed + 10})`;
            } else if (s.status === 'Warning') {
                color = '<span style="color: orange;">Orange</span>';
                reason = `Speed > Permitted (${s.permittedSpeed})`;
            } else if (s.status === 'Indication') {
                color = '<span style="color: yellow;">Yellow</span>';
                reason = `Approaching Target (${s.targetSpeed} km/h)`;
            }

            logic = `
                <br><strong>Needle Color Logic:</strong><br>
                - Status: <strong>${s.status}</strong><br>
                - Color: ${color}<br>
                - Reason: ${reason}
                
                <br><br><strong>CSG Arcs (Ring) Logic:</strong><br>
                - <span style="color: grey;">Dark Grey</span>: 0 to ${s.status === 'Indication' ? 'V_target ('+s.targetSpeed+')' : 'V_perm ('+s.permittedSpeed+')'}<br>
                - <span style="color: yellow;">Yellow</span>: ${s.status === 'Indication' ? 'V_target to V_perm' : 'Hidden'}<br>
                <em>(Yellow arc only appears in Indication status)</em>
            `;
            break;

        case 'area-c':
            title = 'Area C: System Status';
            desc = `
                Level: <strong>${s.level}</strong><br>
                Mode: <strong>${s.mode}</strong>
            `;
            logic = `
                <br><strong>Symbols:</strong><br>
                - LE${s.level.padStart(2, '0')}: Level ${s.level}<br>
                - MO${getModeCode(s.mode)}: ${getModeName(s.mode)}<br>
                - Radio: GSM-R Connected
            `;
            break;
            
        case 'area-d':
            title = 'Area D: Planning';
            desc = 'Shows upcoming track profile (Gradients, Speed Limits).';
            logic = `
                <br><strong>Scale:</strong> Logarithmic (0 - 4000m)<br>
                - <strong>PASP:</strong> Planning Area Speed Profile (Dark/Light Grey segments)<br>
                - <strong>Gradients:</strong> Uphill/Downhill arrows
            `;
            break;

        default:
            return null;
    }

    return { title, desc: desc + logic };
}

function getModeCode(mode) {
    const map = { 'FS': '11', 'OS': '07', 'SH': '01', 'SR': '18', 'TR': '04', 'SF': '02' };
    return map[mode] || '??';
}

function getModeName(mode) {
    const map = { 'FS': 'Full Supervision', 'OS': 'On Sight', 'SH': 'Shunting', 'SR': 'Staff Responsible', 'TR': 'Trip', 'SF': 'System Failure' };
    return map[mode] || mode;
}

function showTooltip(e, staticTitle, staticDesc, elementId) {
    tooltip.classList.remove('hidden');
    
    // Try to get dynamic info
    const dynamicInfo = getLearningInfo(elementId);
    
    if (dynamicInfo) {
        tooltipTitle.innerHTML = dynamicInfo.title;
        tooltipDesc.innerHTML = dynamicInfo.desc;
    } else {
        tooltipTitle.textContent = staticTitle;
        tooltipDesc.textContent = staticDesc;
    }
    
    // Position tooltip near mouse but keep on screen
    const x = e.clientX + 15;
    const y = e.clientY + 15;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
}

function hideTooltip() {
    tooltip.classList.add('hidden');
}

function toggleSound() {
    isSoundEnabled = !isSoundEnabled;
    btnToggleSound.classList.toggle('active');
    btnToggleSound.textContent = isSoundEnabled ? "🔊 Sound On" : "🔇 Sound Off";
    
    if (isSoundEnabled && !audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playBeep(freq = 800, type = 'sine', duration = 0.1) {
    if (!isSoundEnabled || !audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

let lastBeepTime = 0;

function checkAudioAlarms(time) {
    if (!isSoundEnabled) return;

    // Overspeed Beep (Warning/Intervention)
    if (state.status === 'Warning' || state.status === 'Intervention') {
        if (time - lastBeepTime > 500) { // Beep every 500ms
            playBeep(1000, 'square', 0.15);
            lastBeepTime = time;
        }
    }
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
    numCurrentSpeed.value = s.currentSpeed; // Sync number input

    inpPermittedSpeed.value = s.permittedSpeed;
    numPermittedSpeed.value = s.permittedSpeed; // Sync number input

    inpTargetSpeed.value = s.targetSpeed;
    numTargetSpeed.value = s.targetSpeed; // Sync number input

    inpDistance.value = s.distance;
    numDistance.value = s.distance; // Sync number input

    selMode.value = s.mode;
    selLevel.value = s.level;
    selStatus.value = s.status;
}

function updateStatusAutomatic() {
    // ETCS Status Logic (Simplified for Simulation)
    // Reference: ERA_ERTMS_015560 v3.6.0
    
    const vTrain = state.currentSpeed;
    const vPerm = state.permittedSpeed;
    const vTarget = state.targetSpeed;
    const dist = state.distance;
    
    // Thresholds
    const vWarn = vPerm + 5; // Warning Limit (V_perm + 5 km/h)
    const vInt = vPerm + 10; // Intervention Limit (V_perm + 10 km/h) - Simplified
    
    let newStatus = 'Normal';

    // 1. Check Intervention (Highest Priority)
    if (vTrain > vInt) {
        newStatus = 'Intervention';
    }
    // 2. Check Warning
    else if (vTrain > vPerm) {
        newStatus = 'Warning';
    }
    // 3. Check Indication (Approaching Target)
    // If we have a target speed lower than permitted, and we are approaching it
    else if (vTarget < vPerm && dist > 0 && dist < 2000) {
        // In Indication status if we are above the target speed
        // (Strictly speaking, it depends on the braking curve, but this is a good approximation)
        if (vTrain > vTarget) {
            newStatus = 'Indication';
        } else {
            newStatus = 'Normal';
        }
    }
    // 4. Normal
    else {
        newStatus = 'Normal';
    }

    // Update State and UI
    if (state.status !== newStatus) {
        state.status = newStatus;
        selStatus.value = newStatus;
    }
}

function resize() {
    const container = document.getElementById('ui-container');
    
    // Calculate available space
    const padding = 40;
    // Control panel is now on the side, so we don't subtract its height.
    // We just fit the DMI in the window.
    const availableHeight = window.innerHeight - padding;
    const availableWidth = window.innerWidth - padding;

    // Determine scale to fit in the available space
    // Base size is 900x480 (DMI + Windshield/Gap)
    // Actually DMI is 640x480. Windshield is 800x200.
    // The #ui-container contains #cockpit-wrapper.
    // #cockpit-wrapper width is approx 800px (windshield width) or 640px + bezel.
    // Let's assume a safe base width of 900px and height of 700px (Windshield 200 + DMI 480).
    
    // Wait, #cockpit-wrapper is flex column.
    // Windshield (200px) + DMI Bezel (approx 500px). Total height ~700px.
    // Width ~840px (Windshield 800px + borders).
    
    const baseWidth = 850;
    const baseHeight = 750;

    let scale = Math.min(availableWidth / baseWidth, availableHeight / baseHeight);
    
    // Limit minimum scale to ensure visibility
    if (scale < 0.3) scale = 0.3;

    container.style.transform = `scale(${scale})`;
    
    // Adjust layout space because transform: scale doesn't affect layout flow size
    // We might not need margin adjustment if we center it with flexbox in body
    // But let's keep it simple.
}

let lastTime = 0;
let bgPosition = 0;

function loop(timestamp) {
    if (!lastTime) lastTime = timestamp;
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;

    if (isPlaying) {
        updatePlayback();
    } else if (isRecording) {
        recordFrame();
    }

    updateUI();
    updateSimulation(deltaTime);
    checkAudioAlarms(timestamp); // Check for alarms
    draw();
    animationFrameId = requestAnimationFrame(loop);
}

function updateSimulation(deltaTime) {
    // 1. Physics: Distance Countdown
    // If we are moving and have a distance to target, count it down
    if (state.currentSpeed > 0 && state.distance > 0) {
        // Speed (km/h) to m/s: / 3.6
        const speedMS = state.currentSpeed / 3.6;
        const distTraveled = speedMS * (deltaTime / 1000);
        
        state.distance = Math.max(0, state.distance - distTraveled);
        
        // Update Inputs
        inpDistance.value = Math.floor(state.distance);
        numDistance.value = Math.floor(state.distance);
        
        // 1.1 Passing the Target Logic
        if (state.distance <= 0) {
            // We reached the target
            if (state.targetSpeed === 0 && state.currentSpeed > 0) {
                // Passed EOA (End of Authority) -> TRIP / Intervention
                state.status = 'Intervention';
                selStatus.value = 'Intervention';
                // Force stop in a real sim, but here just show red
            } else if (state.targetSpeed > 0 && state.targetSpeed < state.permittedSpeed) {
                // Passed a speed reduction point
                // The new permitted speed becomes the target speed
                state.permittedSpeed = state.targetSpeed;
                state.targetSpeed = 0; // Clear target
                
                // Update UI
                inpPermittedSpeed.value = state.permittedSpeed;
                numPermittedSpeed.value = state.permittedSpeed;
                inpTargetSpeed.value = 0;
                numTargetSpeed.value = 0;
            }
        }

        // Trigger status update as distance changes (might enter Indication zone)
        updateStatusAutomatic();
    }

    if (!elSimBackground) return;
    
    // Move background based on speed
    // Speed is in km/h. Let's map it to pixels per second.
    // 100 km/h = arbitrary pixels/sec
    const speedFactor = 5; // Adjust for visual preference
    const moveAmount = (state.currentSpeed * speedFactor) * (deltaTime / 1000);
    
    if (!isNaN(moveAmount)) {
        bgPosition -= moveAmount;
        // Keep bgPosition within a reasonable range to prevent float precision issues
        // The pattern repeats every 100px, so we can wrap around
        if (bgPosition < -100) bgPosition += 100;
        
        elSimBackground.style.transform = `translateX(${bgPosition}px)`;
    }
    
    // Update overlay
    if (elSimSpeedOverlay) {
        elSimSpeedOverlay.textContent = `${Math.floor(state.currentSpeed)} km/h`;
    } else {
        // Try to recover if element is missing (e.g. after HTML replacement)
        const overlay = document.getElementById('sim-speed-overlay');
        if (overlay) overlay.textContent = `${Math.floor(state.currentSpeed)} km/h`;
    }
    
    // Wheel spin speed & Body Bounce
    const currentWheels = document.querySelectorAll('.wheel');
    const trainUnits = document.querySelectorAll('.train-unit');

    if (currentWheels.length > 0) {
        if (state.currentSpeed > 0) {
            const duration = 1000 / (state.currentSpeed * 2); // Faster speed = lower duration
            currentWheels.forEach(w => {
                w.style.animationDuration = `${Math.max(duration, 0.1)}s`; // Cap at 0.1s
                w.style.animationPlayState = 'running';
            });
            
            // Add bounce effect to all units
            trainUnits.forEach(unit => {
                unit.classList.add('bouncing');
                // Sync bounce speed with train speed roughly
                const bounceDuration = Math.max(0.2, 100 / state.currentSpeed);
                // We need to apply duration to the children (body/front) via CSS variable or direct style
                // But our CSS targets .train-unit.bouncing .train-body
                // So we can set the variable on the unit
                const body = unit.querySelector('.train-body');
                const front = unit.querySelector('.train-front');
                if (body) body.style.animationDuration = `${bounceDuration}s`;
                if (front) front.style.animationDuration = `${bounceDuration}s`;
            });

        } else {
            currentWheels.forEach(w => w.style.animationPlayState = 'paused');
            trainUnits.forEach(unit => unit.classList.remove('bouncing'));
        }
    }
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
    numCurrentSpeed.value = state.currentSpeed;
    
    inpPermittedSpeed.value = state.permittedSpeed;
    numPermittedSpeed.value = state.permittedSpeed;
    
    inpTargetSpeed.value = state.targetSpeed;
    numTargetSpeed.value = state.targetSpeed;
    
    inpDistance.value = state.distance;
    numDistance.value = state.distance;
    
    selMode.value = state.mode;
    selLevel.value = state.level;
    selStatus.value = state.status;
    
    inpTrainNumber.value = state.trainNumber;
    elTrainNumber.textContent = state.trainNumber;
}

function updateUI() {
    // Distance Bar - ERA Spec logarithmic scale
    // Scale: 0-1000m displayed, with logarithmic compression
    // 0m at bottom, 1000m at top
    let heightPct = 0;
    const d = state.distance;
    
    if (d <= 0) {
        heightPct = 0;
    } else if (d <= 100) {
        // Linear scale for 0-100m (bottom portion)
        heightPct = (d / 100) * 20; // 0-20%
    } else if (d <= 500) {
        // Logarithmic for 100-500m
        heightPct = 20 + ((d - 100) / 400) * 30; // 20-50%
    } else if (d <= 1000) {
        // Logarithmic for 500-1000m
        heightPct = 50 + ((d - 500) / 500) * 50; // 50-100%
    } else {
        heightPct = 100;
    }
    
    heightPct = Math.min(heightPct, 100);
    elDistanceFill.style.height = `${heightPct}%`;
    elDistanceValue.textContent = Math.floor(d);
    
    // Distance Bar Color - Grey normally, Yellow in Indication (TSM)
    if (state.status === 'Indication') {
        elDistanceFill.style.backgroundColor = COLORS.yellow;
    } else {
        elDistanceFill.style.backgroundColor = COLORS.grey;
    }

    // Symbols
    elModeIcon.innerHTML = getModeSVG(state.mode);
    elLevelIcon.innerHTML = getLevelSVG(state.level);
    elRadioIcon.innerHTML = getRadioSVG();
    elDriverID.textContent = state.driverID;

    // Brake Intervention Symbol (ST01)
    if (state.status === 'Intervention') {
        elBrakeIcon.style.display = 'flex';
        elBrakeIcon.innerHTML = getBrakeInterventionSVG();
        elRadioIcon.style.display = 'none'; // Hide Radio if sharing space or prioritized
    } else {
        elBrakeIcon.style.display = 'none';
        elRadioIcon.style.display = 'flex';
    }

    // Release Speed (B6) - ERA Spec Figure 42
    // Show release speed when approaching EOA (target speed = 0) and distance < 300m
    // Display as yellow digital value in top right of speed dial area
    if (state.distance > 0 && state.distance < 300 && state.targetSpeed === 0) {
        elB6Area.textContent = state.releaseSpeed;
        elB6Area.style.display = 'block';
        elB6Area.style.color = COLORS.yellow;
    } else if (state.status === 'Indication' && state.distance > 0 && state.distance < 500) {
        // Also show release speed in Indication with target approaching
        elB6Area.textContent = state.releaseSpeed;
        elB6Area.style.display = 'block';
        elB6Area.style.color = COLORS.yellow;
    } else {
        elB6Area.style.display = 'none';
    }

    // Time to Indication (TTI) - A1 - ERA Spec
    // Small white square that appears when approaching indication
    if (state.status === 'Indication' || (state.distance > 0 && state.distance < 1000 && state.targetSpeed < state.permittedSpeed)) {
        // Size varies based on time to indication - larger = more urgent
        const urgency = Math.max(5, Math.min(25, 25 - (state.distance / 50)));
        elA1Area.innerHTML = `<div style="width: ${urgency}px; height: ${urgency}px; background-color: ${COLORS.yellow};"></div>`;
    } else {
        elA1Area.innerHTML = '';
    }

    // Track Conditions (B3-B5)
    // Render dummy conditions if any
    renderTrackConditions();
    
    // Update Values Table
    updateValuesTable();
}

function renderTrackConditions() {
    // Clear
    elB3Area.innerHTML = '';
    elB4Area.innerHTML = '';
    elB5Area.innerHTML = '';

    // Example: If we are in a specific mode or just random for demo
    // Let's add a Pantograph symbol if speed > 50 just to show it works
    const conditions = [];
    if (state.currentSpeed > 50) conditions.push('TC01'); // Pantograph
    if (state.currentSpeed > 100) conditions.push('TC06'); // Neutral Section

    if (conditions[0]) elB3Area.innerHTML = getTrackConditionSVG(conditions[0]);
    if (conditions[1]) elB4Area.innerHTML = getTrackConditionSVG(conditions[1]);
    if (conditions[2]) elB5Area.innerHTML = getTrackConditionSVG(conditions[2]);
}

function updateValuesTable() {
    // Computed thresholds
    const vWarn = state.permittedSpeed + 5;  // V_warn = V_perm + 5 km/h
    const vInt = state.permittedSpeed + 10;  // V_int = V_perm + 10 km/h
    
    // Update cell values
    if (elValVTrain) elValVTrain.textContent = `${Math.round(state.currentSpeed)} km/h`;
    if (elValVPerm) elValVPerm.textContent = `${Math.round(state.permittedSpeed)} km/h`;
    if (elValVTarget) elValVTarget.textContent = `${Math.round(state.targetSpeed)} km/h`;
    if (elValVWarn) elValVWarn.textContent = `${Math.round(vWarn)} km/h`;
    if (elValVInt) elValVInt.textContent = `${Math.round(vInt)} km/h`;
    if (elValDistance) elValDistance.textContent = `${Math.round(state.distance)} m`;
    if (elValStatus) elValStatus.textContent = state.status;
    if (elValMode) elValMode.textContent = state.mode;
    if (elValLevel) elValLevel.textContent = state.level;
    
    // Apply status-based styling to V_train cell
    if (elValVTrain) {
        elValVTrain.className = '';
        switch(state.status) {
            case 'Normal':
                elValVTrain.classList.add('speed-normal');
                break;
            case 'Indication':
                elValVTrain.classList.add('speed-indication');
                break;
            case 'Warning':
                elValVTrain.classList.add('speed-warning');
                break;
            case 'Intervention':
                elValVTrain.classList.add('speed-intervention');
                break;
        }
    }
    
    // Apply status-based styling to Status cell
    if (elValStatus) {
        elValStatus.className = '';
        switch(state.status) {
            case 'Normal':
                elValStatus.classList.add('status-normal');
                break;
            case 'Indication':
                elValStatus.classList.add('status-indication');
                break;
            case 'Warning':
                elValStatus.classList.add('status-warning');
                break;
            case 'Intervention':
                elValStatus.classList.add('status-intervention');
                break;
        }
    }
}

function getTrackConditionSVG(code) {
    const commonAttrs = 'viewBox="0 0 50 50" width="40" height="40" style="width: 40px; height: 40px;"';
    const greyStroke = 'stroke="rgb(195,195,195)" stroke-width="2" fill="none"';
    const yellowStroke = 'stroke="rgb(223,223,0)" stroke-width="2" fill="none"';
    const greyFill = 'fill="rgb(195,195,195)"';
    const yellowFill = 'fill="rgb(223,223,0)"';
    const box = (color) => `<rect x="2" y="2" width="46" height="46" stroke="${color}" stroke-width="2" fill="none"/>`;
    
    // Track Condition Symbols from ERA Spec Table 62
    switch(code) {
        case 'TC01': // Pantograph lowered - grey
            return `<svg ${commonAttrs}>${box('rgb(195,195,195)')}<path d="M 15 38 L 25 20 L 35 38" ${greyStroke}/><line x1="20" y1="12" x2="30" y2="12" ${greyStroke}/><line x1="25" y1="12" x2="25" y2="20" ${greyStroke}/></svg>`;
        case 'TC02': // Lower pantograph - grey
            return `<svg ${commonAttrs}>${box('rgb(195,195,195)')}<path d="M 15 15 L 25 30 L 35 15" ${greyStroke}/><line x1="25" y1="30" x2="25" y2="40" ${greyStroke}/><polygon points="20,40 30,40 25,35" ${greyFill}/></svg>`;
        case 'TC03': // Lower pantograph - yellow (announcement)
            return `<svg ${commonAttrs}>${box('rgb(223,223,0)')}<path d="M 15 15 L 25 30 L 35 15" ${yellowStroke}/><line x1="25" y1="30" x2="25" y2="40" ${yellowStroke}/><polygon points="20,40 30,40 25,35" ${yellowFill}/></svg>`;
        case 'TC04': // Raise pantograph - grey
            return `<svg ${commonAttrs}>${box('rgb(195,195,195)')}<path d="M 15 35 L 25 20 L 35 35" ${greyStroke}/><line x1="25" y1="20" x2="25" y2="10" ${greyStroke}/><polygon points="20,10 30,10 25,15" ${greyFill}/></svg>`;
        case 'TC05': // Raise pantograph - yellow (announcement)
            return `<svg ${commonAttrs}>${box('rgb(223,223,0)')}<path d="M 15 35 L 25 20 L 35 35" ${yellowStroke}/><line x1="25" y1="20" x2="25" y2="10" ${yellowStroke}/><polygon points="20,10 30,10 25,15" ${yellowFill}/></svg>`;
        case 'TC06': // Neutral section - grey
            return `<svg ${commonAttrs}>${box('rgb(195,195,195)')}<rect x="12" y="10" width="26" height="30" ${greyStroke}/><line x1="12" y1="25" x2="22" y2="25" ${greyStroke}/><line x1="28" y1="25" x2="38" y2="25" ${greyStroke}/></svg>`;
        case 'TC07': // Neutral section announcement - yellow
            return `<svg ${commonAttrs}>${box('rgb(223,223,0)')}<rect x="12" y="10" width="26" height="30" ${yellowStroke}/><line x1="12" y1="25" x2="22" y2="25" ${yellowStroke}/><line x1="28" y1="25" x2="38" y2="25" ${yellowStroke}/></svg>`;
        case 'TC08': // End of neutral section - grey
            return `<svg ${commonAttrs}>${box('rgb(195,195,195)')}<rect x="15" y="10" width="20" height="30" ${greyStroke}/></svg>`;
        case 'TC09': // End of neutral section - yellow
            return `<svg ${commonAttrs}>${box('rgb(223,223,0)')}<rect x="15" y="10" width="20" height="30" ${yellowStroke}/></svg>`;
        case 'TC10': // Non stopping area - grey
            return `<svg ${commonAttrs}>${box('rgb(195,195,195)')}<circle cx="25" cy="25" r="15" ${greyStroke}/><line x1="14" y1="14" x2="36" y2="36" stroke="rgb(195,195,195)" stroke-width="3"/></svg>`;
        case 'TC11': // Non stopping area announcement - yellow
            return `<svg ${commonAttrs}>${box('rgb(223,223,0)')}<circle cx="25" cy="25" r="15" ${yellowStroke}/><line x1="14" y1="14" x2="36" y2="36" stroke="rgb(223,223,0)" stroke-width="3"/></svg>`;
        case 'TC12': // Radio hole - grey
            return `<svg ${commonAttrs}>${box('rgb(195,195,195)')}<path d="M 12 35 L 12 25 L 17 25 L 17 35" ${greyFill}/><path d="M 20 35 L 20 18 L 25 18 L 25 35" ${greyFill}/><path d="M 28 35 L 28 12 L 33 12 L 33 35" ${greyFill}/><line x1="8" y1="40" x2="42" y2="8" stroke="rgb(191,0,0)" stroke-width="3"/></svg>`;
        case 'TC35': // Sound horn - yellow
            return `<svg ${commonAttrs}>${box('rgb(223,223,0)')}<polygon points="15,20 25,15 25,35 15,30" ${yellowFill}/><path d="M 28 18 Q 35 25 28 32" ${yellowStroke}/><path d="M 32 15 Q 42 25 32 35" ${yellowStroke}/></svg>`;
        case 'TC36': // Tunnel stopping area - grey
            return `<svg ${commonAttrs}>${box('rgb(195,195,195)')}<path d="M 10 40 L 10 20 Q 25 5 40 20 L 40 40 Z" ${greyStroke}/></svg>`;
        case 'TC37': // Tunnel stopping area announcement - yellow
            return `<svg ${commonAttrs}>${box('rgb(223,223,0)')}<path d="M 10 40 L 10 20 Q 25 5 40 20 L 40 40 Z" ${yellowStroke}/></svg>`;
        default:
            return '';
    }
}

function getRadioSVG(connected = true) {
    // ST03/ST04 - Radio connection status
    const commonAttrs = 'viewBox="0 0 50 50" width="100%" height="100%"';
    const color = connected ? 'rgb(195,195,195)' : 'rgb(191,0,0)';
    
    if (connected) {
        // ST03 - Safe radio connection "Connection Up"
        return `<svg ${commonAttrs}>
            <rect x="2" y="2" width="46" height="46" stroke="${color}" stroke-width="2" fill="none"/>
            <path d="M 15 35 L 15 30 L 20 30 L 20 35" fill="${color}"/>
            <path d="M 22 35 L 22 22 L 27 22 L 27 35" fill="${color}"/>
            <path d="M 29 35 L 29 15 L 34 15 L 34 35" fill="${color}"/>
        </svg>`;
    } else {
        // ST04 - Safe radio connection "Connection Lost"
        return `<svg ${commonAttrs}>
            <rect x="2" y="2" width="46" height="46" stroke="rgb(191,0,0)" stroke-width="2" fill="rgb(191,0,0)"/>
            <path d="M 15 35 L 15 30 L 20 30 L 20 35" fill="rgb(195,195,195)"/>
            <path d="M 22 35 L 22 22 L 27 22 L 27 35" fill="rgb(195,195,195)"/>
            <path d="M 29 35 L 29 15 L 34 15 L 34 35" fill="rgb(195,195,195)"/>
        </svg>`;
    }
}

function getModeSVG(mode) {
    const commonAttrs = 'viewBox="0 0 50 50" width="100%" height="100%"';
    const greyStroke = 'stroke="rgb(195,195,195)" stroke-width="2" fill="none"';
    const greyFill = 'fill="rgb(195,195,195)"';
    const yellowStroke = 'stroke="rgb(223,223,0)" stroke-width="2" fill="none"';
    const yellowFill = 'fill="rgb(223,223,0)"';
    const redStroke = 'stroke="rgb(191,0,0)" stroke-width="2" fill="none"';
    const redFill = 'fill="rgb(191,0,0)"';
    const box = (color) => `<rect x="2" y="2" width="46" height="46" stroke="${color}" stroke-width="2" fill="none"/>`;

    // Mode Symbols from ERA Spec Table 60
    switch (mode) {
        case 'SH': // MO01 - Shunting (train with buffer)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <rect x="30" y="15" width="8" height="20" ${greyFill}/>
                <rect x="10" y="18" width="18" height="14" ${greyStroke}/>
                <circle cx="15" cy="35" r="4" ${greyFill}/>
                <circle cx="23" cy="35" r="4" ${greyFill}/>
            </svg>`;
        case 'TR': // MO04 - Trip (red with grey)
            return `<svg ${commonAttrs}>
                ${box('rgb(191,0,0)')}
                <rect x="15" y="12" width="20" height="8" fill="rgb(191,0,0)"/>
                <rect x="15" y="22" width="20" height="8" ${greyFill}/>
                <rect x="15" y="32" width="20" height="8" fill="rgb(191,0,0)"/>
            </svg>`;
        case 'PT': // MO06 - Post Trip (grey)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <rect x="15" y="12" width="20" height="8" ${greyFill}/>
                <rect x="15" y="22" width="20" height="8" ${greyFill}/>
                <rect x="15" y="32" width="20" height="8" ${greyFill}/>
            </svg>`;
        case 'OS': // MO07 - On Sight (eye symbol)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <ellipse cx="25" cy="25" rx="18" ry="12" ${greyStroke}/>
                <circle cx="25" cy="25" r="6" ${greyFill}/>
            </svg>`;
        case 'SR': // MO09 - Staff Responsible (diagonal pattern)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <line x1="10" y1="40" x2="40" y2="10" ${greyStroke} stroke-width="3"/>
                <line x1="10" y1="30" x2="30" y2="10" ${greyStroke} stroke-width="3"/>
                <line x1="20" y1="40" x2="40" y2="20" ${greyStroke} stroke-width="3"/>
            </svg>`;
        case 'FS': // MO11 - Full Supervision (cross in box)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <line x1="10" y1="10" x2="40" y2="40" ${greyStroke} stroke-width="2"/>
                <line x1="40" y1="10" x2="10" y2="40" ${greyStroke} stroke-width="2"/>
                <line x1="25" y1="8" x2="25" y2="42" ${greyStroke} stroke-width="2"/>
                <line x1="8" y1="25" x2="42" y2="25" ${greyStroke} stroke-width="2"/>
            </svg>`;
        case 'NL': // MO12 - Non-leading (power symbol)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <circle cx="25" cy="28" r="12" ${greyStroke}/>
                <line x1="25" y1="10" x2="25" y2="20" ${greyStroke} stroke-width="3"/>
            </svg>`;
        case 'SB': // MO13 - Stand By (hourglass)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <path d="M 12 10 L 38 10 L 25 25 L 38 40 L 12 40 L 25 25 Z" ${greyStroke}/>
            </svg>`;
        case 'RV': // MO14 - Reversing (curved arrows)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <path d="M 15 20 Q 25 10 35 20" ${greyStroke}/>
                <polygon points="35,15 40,20 35,25" ${greyFill}/>
                <path d="M 35 30 Q 25 40 15 30" ${greyStroke}/>
                <polygon points="15,25 10,30 15,35" ${greyFill}/>
            </svg>`;
        case 'UN': // MO16 - Unfitted (crossed box)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <line x1="10" y1="10" x2="40" y2="40" ${greyStroke} stroke-width="3"/>
                <line x1="40" y1="10" x2="10" y2="40" ${greyStroke} stroke-width="3"/>
            </svg>`;
        case 'SF': // MO18 - System Failure (red warning triangle)
            return `<svg ${commonAttrs}>
                ${box('rgb(191,0,0)')}
                <polygon points="25,8 42,42 8,42" stroke="rgb(191,0,0)" stroke-width="2" fill="none"/>
                <text x="25" y="38" fill="rgb(191,0,0)" font-family="sans-serif" text-anchor="middle" font-weight="bold" font-size="20">!</text>
            </svg>`;
        case 'SN': // MO19 - National System (diamond)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <polygon points="25,8 42,25 25,42 8,25" ${greyStroke}/>
            </svg>`;
        case 'LS': // MO21 - Limited Supervision (diamond with dot)
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <polygon points="25,10 40,25 25,40 10,25" ${greyStroke}/>
                <circle cx="25" cy="25" r="5" ${greyFill}/>
            </svg>`;
        default:
            return `<svg ${commonAttrs}>
                ${box('rgb(195,195,195)')}
                <text x="25" y="32" fill="rgb(195,195,195)" font-family="sans-serif" text-anchor="middle" font-weight="bold" font-size="14">${mode}</text>
            </svg>`;
    }
}

function getLevelSVG(level) {
    const commonAttrs = 'viewBox="0 0 52 21" width="100%" height="100%"';
    const greyFill = 'fill="rgb(195,195,195)"';
    const greyStroke = 'stroke="rgb(195,195,195)" stroke-width="1" fill="none"';
    const box = `<rect x="1" y="1" width="50" height="19" ${greyStroke}/>`;
    const textStyle = 'fill="rgb(195,195,195)" font-family="sans-serif" text-anchor="middle" font-weight="bold"';

    // Level Symbols from ERA Spec Table 59 (52x21 cells)
    switch(level) {
        case '0': // LE01 - Level 0
            return `<svg ${commonAttrs}>
                ${box}
                <text x="26" y="16" ${textStyle} font-size="14">0</text>
                <line x1="5" y1="18" x2="47" y2="18" stroke="rgb(195,195,195)" stroke-width="2"/>
            </svg>`;
        case '1': // LE03 - Level 1 (intermittent transmission bars)
            return `<svg ${commonAttrs}>
                ${box}
                <text x="26" y="16" ${textStyle} font-size="14">1</text>
                <rect x="8" y="4" width="4" height="5" ${greyFill}/>
                <rect x="14" y="4" width="4" height="5" ${greyFill}/>
                <rect x="34" y="4" width="4" height="5" ${greyFill}/>
                <rect x="40" y="4" width="4" height="5" ${greyFill}/>
            </svg>`;
        case '2': // LE04 - Level 2 (continuous transmission)
            return `<svg ${commonAttrs}>
                ${box}
                <text x="26" y="16" ${textStyle} font-size="14">2</text>
                <rect x="8" y="4" width="36" height="4" ${greyFill}/>
            </svg>`;
        case '3': // LE05 - Level 3 (continuous transmission)
            return `<svg ${commonAttrs}>
                ${box}
                <text x="26" y="16" ${textStyle} font-size="14">3</text>
                <rect x="8" y="4" width="36" height="4" ${greyFill}/>
            </svg>`;
        case 'NTC': // LE02 - NTC level
            return `<svg ${commonAttrs}>
                ${box}
                <text x="26" y="15" ${textStyle} font-size="11">NTC</text>
            </svg>`;
        default:
            return `<svg ${commonAttrs}>
                ${box}
                <text x="26" y="15" ${textStyle} font-size="12">${level}</text>
            </svg>`;
    }
}

function getBrakeInterventionSVG() {
    // ST01 - Service/Emergency Brake Intervention (red with grey)
    const commonAttrs = 'viewBox="0 0 52 21" width="100%" height="100%"';
    return `<svg ${commonAttrs}>
        <rect x="1" y="1" width="50" height="19" stroke="rgb(191,0,0)" stroke-width="2" fill="rgb(191,0,0)"/>
        <circle cx="26" cy="10" r="7" fill="rgb(195,195,195)"/>
        <rect x="20" y="8" width="12" height="4" fill="rgb(191,0,0)"/>
    </svg>`;
}

function getAdhesionSVG() {
    // ST02 - Adhesion factor "slippery rail"
    const commonAttrs = 'viewBox="0 0 52 21" width="100%" height="100%"';
    return `<svg ${commonAttrs}>
        <rect x="1" y="1" width="50" height="19" stroke="rgb(195,195,195)" stroke-width="1" fill="none"/>
        <path d="M 10 15 Q 18 5 26 15 Q 34 25 42 15" stroke="rgb(195,195,195)" stroke-width="2" fill="none"/>
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
    const max = state.maxScale;
    
    // ERA Spec: Different tick intervals for different max scales
    // 140 km/h: ticks at 0, 10, 20... numbers at 0, 20, 40...
    // 180 km/h: ticks at 0, 10, 20... numbers at 0, 20, 40...
    // 250 km/h: ticks at 0, 10, 20... numbers at 0, 50, 100...
    // 400 km/h: ticks at 0, 20, 40... numbers at 0, 50, 100...
    
    let minorTickStep, majorTickStep, numberStep;
    
    if (max <= 140) {
        minorTickStep = 10;
        majorTickStep = 20;
        numberStep = 20;
    } else if (max <= 180) {
        minorTickStep = 10;
        majorTickStep = 20;
        numberStep = 20;
    } else if (max <= 250) {
        minorTickStep = 10;
        majorTickStep = 50;
        numberStep = 50;
    } else {
        minorTickStep = 20;
        majorTickStep = 50;
        numberStep = 50;
    }

    // Draw ticks
    for (let s = 0; s <= max; s += minorTickStep) {
        const angle = getAngleForSpeed(s);
        const isMajor = (s % majorTickStep === 0);
        const innerR = isMajor ? dialRadius - 15 : dialRadius - 8;
        const outerR = dialRadius;
        
        const x1 = centerX + Math.cos(angle) * innerR;
        const y1 = centerY + Math.sin(angle) * innerR;
        const x2 = centerX + Math.cos(angle) * outerR;
        const y2 = centerY + Math.sin(angle) * outerR;

        ctx.beginPath();
        ctx.strokeStyle = COLORS.white;
        ctx.lineWidth = isMajor ? 2 : 1;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        
        // Draw numbers for number ticks
        if (s % numberStep === 0) {
            const textR = dialRadius - 28;
            const tx = centerX + Math.cos(angle) * textR;
            const ty = centerY + Math.sin(angle) * textR;
            
            ctx.fillStyle = COLORS.white;
            ctx.font = 'bold 14px "Arial", sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(s.toString(), tx, ty);
        }
    }
}

function drawCSG() {
    const csgRadius = radius;
    const lineWidth = 15; // Arc thickness as per ERA spec
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt'; // Sharp ends

    // Zero Zone: Small segment before 0 km/h (-149 to -144 degrees)
    drawArc(degToRad(-149), degToRad(-144), COLORS.darkGrey);

    // ERA Spec Logic:
    // - Normal (NoS): Grey arc from 0 to V_perm
    // - Indication (IndS): Grey arc from 0 to V_target, Yellow arc from V_target to V_perm
    // - Warning (OvS): Grey arc 0 to V_perm, Orange arc V_perm to V_train
    // - Intervention (IntS): Grey arc 0 to V_perm, Red arc V_perm to V_train

    const vPerm = state.permittedSpeed;
    const vTarget = state.targetSpeed;
    const vTrain = state.currentSpeed;

    if (state.status === 'Indication') {
        // Indication: Grey to target, Yellow from target to permitted
        if (vTarget > 0) {
            drawArc(getAngleForSpeed(0), getAngleForSpeed(vTarget), COLORS.darkGrey);
        }
        if (vPerm > vTarget) {
            drawArc(getAngleForSpeed(vTarget), getAngleForSpeed(vPerm), COLORS.yellow);
        }
    } else if (state.status === 'Warning') {
        // Warning: Grey to permitted, Orange from permitted to train speed
        if (vPerm > 0) {
            drawArc(getAngleForSpeed(0), getAngleForSpeed(vPerm), COLORS.darkGrey);
        }
        if (vTrain > vPerm) {
            drawArc(getAngleForSpeed(vPerm), getAngleForSpeed(vTrain), COLORS.orange);
        }
    } else if (state.status === 'Intervention') {
        // Intervention: Grey to permitted, Red from permitted to train speed
        if (vPerm > 0) {
            drawArc(getAngleForSpeed(0), getAngleForSpeed(vPerm), COLORS.darkGrey);
        }
        if (vTrain > vPerm) {
            drawArc(getAngleForSpeed(vPerm), getAngleForSpeed(vTrain), COLORS.red);
        }
    } else {
        // Normal: Grey arc from 0 to V_perm
        if (vPerm > 0) {
            drawArc(getAngleForSpeed(0), getAngleForSpeed(vPerm), COLORS.darkGrey);
        }
    }

    // Hook at Permitted Speed (always shown)
    drawHook(vPerm);
}

function drawArc(startRad, endRad, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.arc(centerX, centerY, radius, startRad, endRad);
    ctx.stroke();
}

function drawHook(speed) {
    if (speed <= 0) return;
    
    const angle = getAngleForSpeed(speed);
    
    // ERA Spec: Hook is a white triangular marker pointing inward
    // It marks the V_perm position on the CSG
    
    const outerR = radius + 8;  // Start from outer edge of arc
    const innerR = radius - 12; // End point (inward)
    
    // Calculate the tip and base of the hook triangle
    const tipX = centerX + Math.cos(angle) * innerR;
    const tipY = centerY + Math.sin(angle) * innerR;
    
    const baseX = centerX + Math.cos(angle) * outerR;
    const baseY = centerY + Math.sin(angle) * outerR;
    
    // Perpendicular offset for the base width
    const perpAngle = angle + Math.PI / 2;
    const halfWidth = 4;
    
    const base1X = baseX + Math.cos(perpAngle) * halfWidth;
    const base1Y = baseY + Math.sin(perpAngle) * halfWidth;
    const base2X = baseX - Math.cos(perpAngle) * halfWidth;
    const base2Y = baseY - Math.sin(perpAngle) * halfWidth;
    
    // Draw the hook as a filled triangle pointing inward
    ctx.beginPath();
    ctx.fillStyle = COLORS.white;
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(base1X, base1Y);
    ctx.lineTo(base2X, base2Y);
    ctx.closePath();
    ctx.fill();
}

function drawNeedle() {
    const angle = getAngleForSpeed(state.currentSpeed);
    const needleLen = 100; // Needle length to reach dial marks
    
    // ERA Spec Color Logic for pointer:
    // - Normal (NoS): Grey pointer, black text
    // - Indication (IndS): Yellow pointer, black text
    // - Warning (OvS): Orange pointer, black text
    // - Intervention (IntS): Red pointer, white text
    
    let needleColor = COLORS.grey;
    let hubColor = COLORS.grey;
    let textColor = COLORS.black;
    
    if (state.status === 'Indication') {
        needleColor = COLORS.yellow;
        hubColor = COLORS.yellow;
        textColor = COLORS.black;
    } else if (state.status === 'Warning') {
        needleColor = COLORS.orange;
        hubColor = COLORS.orange;
        textColor = COLORS.black;
    } else if (state.status === 'Intervention') {
        needleColor = COLORS.red;
        hubColor = COLORS.red;
        textColor = COLORS.white;
    }

    // Draw Needle
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle); 

    // Needle shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;

    // Draw tapered needle shape (ERA spec style)
    ctx.beginPath();
    ctx.fillStyle = needleColor;
    // Wide base at center, pointed tip
    ctx.moveTo(0, -6);       // Top of base
    ctx.lineTo(needleLen - 10, -2);  // Taper to tip
    ctx.lineTo(needleLen, 0);         // Tip
    ctx.lineTo(needleLen - 10, 2);   // Taper from tip
    ctx.lineTo(0, 6);        // Bottom of base
    ctx.closePath();
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // Draw center hub (circular display for digital speed)
    ctx.rotate(-angle); // Rotate back for circle and text
    
    // Hub background
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.fillStyle = hubColor;
    ctx.fill();
    
    // Hub border
    ctx.beginPath();
    ctx.arc(0, 0, 32, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Digital Speed text
    ctx.fillStyle = textColor;
    ctx.font = 'bold 26px "Arial", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(state.currentSpeed), 0, 2); 

    ctx.restore();
}

init();
