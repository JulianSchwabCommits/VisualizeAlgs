// DOM-Elemente
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const algorithm_select = document.getElementById('algorithm');
const generate_btn = document.getElementById('generateBtn');
const start_btn = document.getElementById('startBtn');
const reset_btn = document.getElementById('resetBtn');
const speed_control = document.getElementById('speed');
const current_algorithm_element = document.getElementById('currentAlgorithm');
const algorithm_description_element = document.getElementById('algorithmDescription');
const comparisons_element = document.getElementById('comparisons');
const swaps_element = document.getElementById('swaps');
const time_element = document.getElementById('time');
const sound_toggle = document.getElementById('sound_toggle');
const swap_sound = document.getElementById('swap_sound');

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
const ARRAY_SIZE = 50;
const MIN_VALUE = 5;
const MAX_VALUE = 100;

// Algorithmus-Beschreibungen
const algorithmDescriptions = {
    bubble: "Bubble Sort vergleicht benachbarte Elemente und tauscht sie, wenn sie in der falschen Reihenfolge sind. Der Algorithmus durchläuft die Liste mehrmals und 'schiebt' das größte Element nach oben.",
    selection: "Selection Sort teilt die Liste in einen sortierten und einen unsortierten Teil. In jedem Schritt wird das kleinste Element aus dem unsortierten Teil gefunden und in den sortierten Teil verschoben.",
    insertion: "Insertion Sort baut eine sortierte Liste nach und nach auf, indem es ein Element nach dem anderen aus der unsortierten Liste nimmt und an der richtigen Position in der sortierten Liste einfügt.",
    quick: "Quick Sort verwendet ein Teile-und-Herrsche-Verfahren. Ein Pivot-Element wird ausgewählt und die Liste wird so umgeordnet, dass alle kleineren Elemente vor und alle größeren nach dem Pivot stehen.",
    merge: "Merge Sort zerlegt die Liste in kleinere Teillisten, sortiert diese und führt sie dann wieder zu einer sortierten Gesamtliste zusammen. Es ist ein stabiler, effizienter Sortieralgorithmus."
};

// Canvas-Dimensionen anpassen
function resize_canvas() {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
}

// Array mit zufälligen Werten initialisieren
function generate_random_array() {
    array = [];
    for (let i = 0; i < ARRAY_SIZE; i++) {
        array.push(Math.floor(Math.random() * (MAX_VALUE - MIN_VALUE + 1)) + MIN_VALUE);
    }
    reset_stats();
    draw_array(array);
    is_running = false;
    start_btn.disabled = false;
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
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const bar_width = canvas.width / arr.length;
    const scale_factor = canvas.height / MAX_VALUE;
    
    for (let i = 0; i < arr.length; i++) {
        // Farbe basierend auf Hervorhebung bestimmen
        if (highlight[0] === i) {
            ctx.fillStyle = '#FF4136'; // Rot für aktiven Vergleich
        } else if (highlight[1] === i) {
            ctx.fillStyle = '#FF851B'; // Orange für zweiten Vergleichswert
        } else if (highlight[2] === i) {
            ctx.fillStyle = '#3D9970'; // Grün für sortierte Elemente
        } else {
            ctx.fillStyle = '#0074D9'; // Blau für normale Elemente
        }
        
        const bar_height = arr[i] * scale_factor;
        ctx.fillRect(
            i * bar_width, 
            canvas.height - bar_height, 
            bar_width - 1, 
            bar_height
        );
    }
}

// Play sound when a bar changes position
function play_swap_sound(value) {
    if (sound_toggle.checked) {
        // Calculate pitch based on the value's position in the possible range
        // Map the value from MIN_VALUE-MAX_VALUE to a reasonable pitch range (0.5-2.0)
        const normalized_value = (value - MIN_VALUE) / (MAX_VALUE - MIN_VALUE);
        const pitch = 0.5 + normalized_value * 1.5; // This gives us a range from 0.5 to 2.0
        
        swap_sound.volume = 0.3; // Keep volume moderate
        swap_sound.playbackRate = pitch;
        
        // Clone and play the sound to allow overlapping sounds
        swap_sound.cloneNode(true).play().catch(e => console.log("Audio playback error:", e));
    }
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
    
    async function partition(low, high) {
        const pivot = arr_copy[high];
        let i = low - 1;
        
        for (let j = low; j < high; j++) {
            comp_count++;
            
            states.push({
                array: [...arr_copy],
                highlight: [j, high, i],
                comparisons: comp_count,
                swaps: swap_count
            });
            
            if (arr_copy[j] <= pivot) {
                i++;
                [arr_copy[i], arr_copy[j]] = [arr_copy[j], arr_copy[i]];
                swap_count++;
                
                states.push({
                    array: [...arr_copy],
                    highlight: [i, j, high],
                    comparisons: comp_count,
                    swaps: swap_count
                });
            }
        }
        
        [arr_copy[i + 1], arr_copy[high]] = [arr_copy[high], arr_copy[i + 1]];
        swap_count++;
        
        states.push({
            array: [...arr_copy],
            highlight: [i + 1, high, null],
            comparisons: comp_count,
            swaps: swap_count
        });
        
        return i + 1;
    }
    
    async function quick_sort_recursive(low, high) {
        if (low < high) {
            const pi = await partition(low, high);
            
            await quick_sort_recursive(low, pi - 1);
            await quick_sort_recursive(pi + 1, high);
        }
    }
    
    await quick_sort_recursive(0, arr_copy.length - 1);
    
    // Finalen Zustand aufzeichnen
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
    algorithm_description_element.textContent = algorithmDescriptions[algorithm];
}

// Event-Listener
window.addEventListener('resize', resize_canvas);
algorithm_select.addEventListener('change', update_algorithm_description);
generate_btn.addEventListener('click', generate_random_array);
start_btn.addEventListener('click', start_algorithm);
reset_btn.addEventListener('click', reset_animation);

// Initialisierung
resize_canvas();
generate_random_array();
update_algorithm_description(); 