// DOM-Elemente
let canvas, ctx, algorithm_select, generate_btn, start_btn, reset_btn, 
    speed_control, current_algorithm_element, algorithm_description_element, 
    comparisons_element, swaps_element, time_element, sound_toggle;

// Initialize DOM references
function initializeDOMReferences() {
    canvas = document.getElementById('visualizer');
    ctx = canvas?.getContext('2d');
    algorithm_select = document.getElementById('algorithm');
    generate_btn = document.getElementById('generate_btn');
    start_btn = document.getElementById('start_btn');
    reset_btn = document.getElementById('reset_btn');
    speed_control = document.getElementById('speed');
    current_algorithm_element = document.getElementById('currentAlgorithm');
    algorithm_description_element = document.getElementById('algorithmDescription');
    comparisons_element = document.getElementById('comparisons');
    swaps_element = document.getElementById('swaps');
    time_element = document.getElementById('time');
    sound_toggle = document.getElementById('sound_toggle');
}

// Audio Context setup
let audio_ctx;
let oscillator;
let gain_node;

// Zustandsvariablen
let array = [];
let array_states = [];
let animation_frame_id = null;
let is_running = false;
let comparisons = 0;
let swaps = 0;
let start_time = 0;
let current_step = 0;
let previous_array = null; // To track array changes for sound
const ARRAY_SIZE = 75; // Changed from 150 back to 50 (removing 2/3 of pillars)
const MIN_VALUE = 5;
const MAX_VALUE = 100;

// Algorithmus-Beschreibungen
const algorithm_descriptions = {
    bubble: "Compares adjacent elements and swaps them if they're in the wrong order. Simple but inefficient for large datasets.",
    selection: "Divides the array into sorted and unsorted regions, repeatedly selecting the smallest element from the unsorted region.",
    insertion: "Builds the final sorted array one item at a time, by repeatedly inserting a new element into the sorted portion of the array.",
    quick: "Uses a divide-and-conquer strategy with a pivot element to partition and sort the array. Highly efficient for most cases.",
    merge: "A stable, divide-and-conquer algorithm that recursively splits the array, sorts, and merges back together. Consistent O(n log n) performance."
};

// Canvas-Dimensionen anpassen
function resize_canvas() {
    // Get the display dimensions of the container
    const rect = canvas.getBoundingClientRect();
    
    // Set the canvas dimensions to match the display size
    canvas.width = rect.width;
    canvas.height = rect.height;
    
    // Reset any transformations
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    // Redraw the array if it exists
    if (array && array.length > 0) {
        draw_array(array);
    }
}

// Array mit zufälligen Werten initialisieren
function generate_random_array() {
    array = [];
    for (let i = 0; i < ARRAY_SIZE; i++) {
        const value = Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1)) + MIN_VALUE;
        array.push(value);
    }
    
    // Debug logging
    console.log('Generated array:', {
        length: array.length,
        min: Math.min(...array),
        max: Math.max(...array),
        sample: array.slice(0, 5)
    });
    
    // Ensure canvas is properly sized before drawing
    resize_canvas();
    reset_stats();
    draw_array(array);
    is_running = false;
    
    // Only set button state if the button exists
    if (start_btn) {
        start_btn.disabled = false;
    }
}

// Statistiken zurücksetzen
function reset_stats() {
    comparisons = 0;
    swaps = 0;
    start_time = 0;
    update_stats();
}

// Statistiken aktualisieren
function update_stats() {
    comparisons_element.textContent = comparisons;
    swaps_element.textContent = swaps;
    if (start_time > 0) {
        time_element.textContent = Math.round(performance.now() - start_time);
    } else {
        time_element.textContent = '0';
    }
}

// Array zeichnen
function draw_array(arr, highlight = []) {
    if (!arr || arr.length === 0) {
        console.warn('No array data to draw');
        return;
    }

    // Clear the entire canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate dimensions
    const padding = 10;
    const available_width = canvas.width - (2 * padding);
    const available_height = canvas.height - (2 * padding);
    const bar_width = Math.floor(available_width / arr.length);
    const scale_factor = (available_height * 0.9) / MAX_VALUE; // Leave 10% margin at top
    
    // Debug logging
    console.log('Drawing array:', {
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        availableWidth: available_width,
        availableHeight: available_height,
        barWidth: bar_width,
        scaleFactor: scale_factor,
        arrayLength: arr.length,
        firstValue: arr[0],
        lastValue: arr[arr.length - 1]
    });
    
    // Draw each bar
    arr.forEach((value, i) => {
        // Set color based on highlight state
        if (highlight[0] === i) {
            ctx.fillStyle = '#404040'; // Dark grey for active comparison
        } else if (highlight[1] === i) {
            ctx.fillStyle = '#808080'; // Medium grey for second value
        } else if (highlight[2] === i) {
            ctx.fillStyle = '#d3d3d3'; // Light grey for sorted elements
        } else {
            ctx.fillStyle = '#e8e8e8'; // Lighter grey for normal elements
        }
        
        // Calculate bar dimensions
        const bar_height = Math.max(value * scale_factor, 2); // Minimum height of 2px
        const x = padding + (i * bar_width);
        const y = canvas.height - padding - bar_height;
        const width = Math.max(bar_width - 2, 1); // Leave 1px gap between bars
        
        // Draw bar (simplified version without rounded corners for debugging)
        ctx.fillRect(x, y, width, bar_height);
        
        // Debug log for first and last bars
        if (i === 0 || i === arr.length - 1) {
            console.log(`Bar ${i}:`, {
                x, y, width, height: bar_height,
                value, color: ctx.fillStyle
            });
        }
    });
}

// Initialize audio context
function init_audio() {
    audio_ctx = new (window.AudioContext || window.webkitAudioContext)();
    gain_node = audio_ctx.createGain();
    gain_node.connect(audio_ctx.destination);
    gain_node.gain.value = 0.1; // Keep volume low
}

// Play sound when a bar changes position
function play_swap_sound(value) {
    if (!sound_toggle.checked) return;
    if (!audio_ctx) init_audio();
    
    // Map value to frequency range (lower number = lower frequency)
    // Using exponential scale for more natural sound
    const min_freq = 220; // A3 note
    const max_freq = 880; // A5 note
    const normalized_value = (value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE);
    const frequency = min_freq * Math.pow(max_freq/min_freq, normalized_value);
    
    // Create and configure oscillator
    const osc = audio_ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    osc.connect(gain_node);
    
    // Play short beep
    osc.start();
    setTimeout(() => osc.stop(), 50);
}

// Check for array changes to trigger sound
function has_array_changed(previous, current) {
    if (!previous || !current) return false;
    
    for (let i = 0; i < previous.length; i++) {
        if (previous[i] !== current[i]) {
            // Return both whether there was a change and the new value
            return previous[i] !== current[i] ? current[i] : false;
        }
    }
    return false;
}

// Animation abspielen
function play_animation() {
    if (current_step >= array_states.length) {
        is_running = false;
        return;
    }
    
    const speed = parseInt(speed_control.value);
    const delay = 101 - speed; // Umkehrung, damit höherer Wert = schneller
    
    setTimeout(() => {
        const state = array_states[current_step];
        
        // Check if array has changed from previous state and play sound if it did
        const changed_value = previous_array && has_array_changed(previous_array, state.array);
        if (changed_value !== false) {
            play_swap_sound(changed_value);
        }
        
        // Update previous array for next comparison
        previous_array = [...state.array];
        
        draw_array(state.array, state.highlight);
        comparisons = state.comparisons;
        swaps = state.swaps;
        update_stats();
        
        current_step++;
        if (is_running) {
            play_animation();
        }
    }, delay);
}

// Bubble Sort
async function bubble_sort(arr) {
    const states = [];
    const arr_copy = [...arr];
    let comp_count = 0;
    let swap_count = 0;
    
    for (let i = 0; i < arr_copy.length; i++) {
        for (let j = 0; j < arr_copy.length - i - 1; j++) {
            comp_count++;
            // Zustand aufzeichnen - Vergleichselemente hervorheben
            states.push({
                array: [...arr_copy],
                highlight: [j, j + 1, arr_copy.length - i],
                comparisons: comp_count,
                swaps: swap_count
            });
            
            if (arr_copy[j] > arr_copy[j + 1]) {
                // Tausch durchführen
                [arr_copy[j], arr_copy[j + 1]] = [arr_copy[j + 1], arr_copy[j]];
                swap_count++;
                
                // Zustand nach dem Tausch aufzeichnen
                states.push({
                    array: [...arr_copy],
                    highlight: [j, j + 1, arr_copy.length - i],
                    comparisons: comp_count,
                    swaps: swap_count
                });
            }
        }
    }
    
    // Finalen Zustand aufzeichnen
    states.push({
        array: [...arr_copy],
        highlight: [],
        comparisons: comp_count,
        swaps: swap_count
    });
    
    return states;
}

// Selection Sort
async function selection_sort(arr) {
    const states = [];
    const arr_copy = [...arr];
    let comp_count = 0;
    let swap_count = 0;
    
    for (let i = 0; i < arr_copy.length - 1; i++) {
        let min_idx = i;
        
        for (let j = i + 1; j < arr_copy.length; j++) {
            comp_count++;
            // Zustand aufzeichnen - aktuelle Elemente hervorheben
            states.push({
                array: [...arr_copy],
                highlight: [min_idx, j, i - 1 >= 0 ? i - 1 : null],
                comparisons: comp_count,
                swaps: swap_count
            });
            
            if (arr_copy[j] < arr_copy[min_idx]) {
                min_idx = j;
            }
        }
        
        if (min_idx !== i) {
            // Tausch durchführen
            [arr_copy[i], arr_copy[min_idx]] = [arr_copy[min_idx], arr_copy[i]];
            swap_count++;
            
            // Zustand nach dem Tausch aufzeichnen
            states.push({
                array: [...arr_copy],
                highlight: [i, min_idx, i - 1 >= 0 ? i - 1 : null],
                comparisons: comp_count,
                swaps: swap_count
            });
        }
    }
    
    // Finalen Zustand aufzeichnen
    states.push({
        array: [...arr_copy],
        highlight: [],
        comparisons: comp_count,
        swaps: swap_count
    });
    
    return states;
}

// Insertion Sort
async function insertion_sort(arr) {
    const states = [];
    const arr_copy = [...arr];
    let comp_count = 0;
    let swap_count = 0;
    
    for (let i = 1; i < arr_copy.length; i++) {
        const key = arr_copy[i];
        let j = i - 1;
        
        states.push({
            array: [...arr_copy],
            highlight: [i, null, i - 1],
            comparisons: comp_count,
            swaps: swap_count
        });
        
        while (j >= 0 && arr_copy[j] > key) {
            comp_count++;
            arr_copy[j + 1] = arr_copy[j];
            swap_count++;
            
            states.push({
                array: [...arr_copy],
                highlight: [j, j + 1, i - 1],
                comparisons: comp_count,
                swaps: swap_count
            });
            
            j--;
        }
        
        if (j + 1 !== i) {
            arr_copy[j + 1] = key;
            
            states.push({
                array: [...arr_copy],
                highlight: [j + 1, null, i],
                comparisons: comp_count,
                swaps: swap_count
            });
        }
    }
    
    // Finalen Zustand aufzeichnen
    states.push({
        array: [...arr_copy],
        highlight: [],
        comparisons: comp_count,
        swaps: swap_count
    });
    
    return states;
}

// Quick Sort
async function quick_sort(arr) {
    const states = [];
    const arr_copy = [...arr];
    let comp_count = 0;
    let swap_count = 0;
    
    // Helper function to swap elements and record state
    function swap(i, j) {
        [arr_copy[i], arr_copy[j]] = [arr_copy[j], arr_copy[i]];
        swap_count++;
        states.push({
            array: [...arr_copy],
            highlight: [i, j, null],
            comparisons: comp_count,
            swaps: swap_count
        });
    }
    
    // Choose median-of-three as pivot
    function choose_pivot(low, high) {
        const mid = Math.floor((low + high) / 2);
        const a = arr_copy[low];
        const b = arr_copy[mid];
        const c = arr_copy[high];
        
        comp_count += 2;
        // Return the index of the median value
        if (a <= b && b <= c) return mid;
        if (a <= c && c <= b) return high;
        if (b <= a && a <= c) return low;
        if (b <= c && c <= a) return high;
        if (c <= a && a <= b) return low;
        return mid;
    }
    
    async function partition(low, high) {
        // Choose better pivot using median-of-three
        const pivot_idx = choose_pivot(low, high);
        const pivot = arr_copy[pivot_idx];
        
        // Move pivot to end
        if (pivot_idx !== high) {
            swap(pivot_idx, high);
        }
        
        let i = low - 1;
        
        // Record partition range
        states.push({
            array: [...arr_copy],
            highlight: [low, high, null],
            comparisons: comp_count,
            swaps: swap_count
        });
        
        for (let j = low; j < high; j++) {
            comp_count++;
            
            // Highlight current comparison
            states.push({
                array: [...arr_copy],
                highlight: [j, high, i >= low ? i : null],
                comparisons: comp_count,
                swaps: swap_count
            });
            
            if (arr_copy[j] <= pivot) {
                i++;
                if (i !== j) {
                    swap(i, j);
                }
            }
        }
        
        // Place pivot in its final position
        swap(i + 1, high);
        
        // Highlight the partition point
        states.push({
            array: [...arr_copy],
            highlight: [i + 1, null, null],
            comparisons: comp_count,
            swaps: swap_count
        });
        
        return i + 1;
    }
    
    async function quick_sort_recursive(low, high) {
        if (low < high) {
            // Show current subarray being processed
            states.push({
                array: [...arr_copy],
                highlight: [low, high, null],
                comparisons: comp_count,
                swaps: swap_count
            });
            
            const pi = await partition(low, high);
            
            await quick_sort_recursive(low, pi - 1);
            await quick_sort_recursive(pi + 1, high);
        }
    }
    
    await quick_sort_recursive(0, arr_copy.length - 1);
    
    // Final state
    states.push({
        array: [...arr_copy],
        highlight: [],
        comparisons: comp_count,
        swaps: swap_count
    });
    
    return states;
}

// Merge Sort
async function merge_sort(arr) {
    const states = [];
    const arr_copy = [...arr];
    let comp_count = 0;
    let swap_count = 0;
    
    async function merge_sort_recursive(start, end) {
        if (end - start <= 1) {
            return;
        }
        
        const mid = Math.floor((start + end) / 2);
        
        await merge_sort_recursive(start, mid);
        await merge_sort_recursive(mid, end);
        
        await merge(start, mid, end);
    }
    
    async function merge(start, mid, end) {
        const left_arr = arr_copy.slice(start, mid);
        const right_arr = arr_copy.slice(mid, end);
        
        let i = 0, j = 0, k = start;
        
        while (i < left_arr.length && j < right_arr.length) {
            comp_count++;
            
            states.push({
                array: [...arr_copy],
                highlight: [start + i, mid + j, null],
                comparisons: comp_count,
                swaps: swap_count
            });
            
            if (left_arr[i] <= right_arr[j]) {
                arr_copy[k] = left_arr[i];
                i++;
            } else {
                arr_copy[k] = right_arr[j];
                j++;
            }
            
            swap_count++;
            k++;
            
            states.push({
                array: [...arr_copy],
                highlight: [k - 1, null, null],
                comparisons: comp_count,
                swaps: swap_count
            });
        }
        
        while (i < left_arr.length) {
            arr_copy[k] = left_arr[i];
            swap_count++;
            i++;
            k++;
            
            states.push({
                array: [...arr_copy],
                highlight: [k - 1, null, null],
                comparisons: comp_count,
                swaps: swap_count
            });
        }
        
        while (j < right_arr.length) {
            arr_copy[k] = right_arr[j];
            swap_count++;
            j++;
            k++;
            
            states.push({
                array: [...arr_copy],
                highlight: [k - 1, null, null],
                comparisons: comp_count,
                swaps: swap_count
            });
        }
    }
    
    await merge_sort_recursive(0, arr_copy.length);
    
    // Finalen Zustand aufzeichnen
    states.push({
        array: [...arr_copy],
        highlight: [],
        comparisons: comp_count,
        swaps: swap_count
    });
    
    return states;
}

// Starte den ausgewählten Algorithmus
async function start_algorithm() {
    if (is_running) return;
    
    is_running = true;
    start_time = performance.now();
    start_btn.disabled = true;
    reset_btn.disabled = false;
    previous_array = [...array]; // Initialize previous array
    
    const algorithm = algorithm_select.value;
    
    switch (algorithm) {
        case 'bubble':
            array_states = await bubble_sort(array);
            break;
        case 'selection':
            array_states = await selection_sort(array);
            break;
        case 'insertion':
            array_states = await insertion_sort(array);
            break;
        case 'quick':
            array_states = await quick_sort(array);
            break;
        case 'merge':
            array_states = await merge_sort(array);
            break;
    }
    
    current_step = 0;
    play_animation();
}

// Animation zurücksetzen
function reset_animation() {
    is_running = false;
    start_btn.disabled = false;
    draw_array(array);
    reset_stats();
    previous_array = null; // Reset previous array
}

// Algorithmus-Beschreibung aktualisieren
function update_algorithm_description() {
    const algorithm = algorithm_select.value;
    current_algorithm_element.textContent = algorithm_select.options[algorithm_select.selectedIndex].text;
    algorithm_description_element.textContent = algorithm_descriptions[algorithm];
}

// Event-Listener setup function
function setup_event_listeners() {
    if (window) {
        window.addEventListener('resize', resize_canvas);
    }
    
    if (algorithm_select) {
        algorithm_select.addEventListener('change', update_algorithm_description);
    }
    
    if (generate_btn) {
        generate_btn.addEventListener('click', generate_random_array);
    }
    
    if (start_btn) {
        start_btn.addEventListener('click', start_algorithm);
    }
    
    if (reset_btn) {
        reset_btn.addEventListener('click', reset_animation);
    }
}

// Initialisierung
function init() {
    console.log('Initializing visualization...');
    
    initializeDOMReferences();
    
    // Check if canvas exists and context is available
    if (!canvas || !ctx) {
        console.error('Canvas element not found or context not available!');
        return;
    }
    
    // Log canvas dimensions
    console.log('Canvas dimensions:', {
        width: canvas.width,
        height: canvas.height,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        style: {
            width: canvas.style.width,
            height: canvas.style.height
        }
    });
    
    resize_canvas();
    generate_random_array();
    update_algorithm_description();
    setup_event_listeners();
}

// Call init when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);