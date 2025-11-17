// Margine esterno per non disegnare sui bordi del canvas
let outerMargin = 100;

// Variabile che conterrà i dati caricati dal CSV
let data;

// Variabili globali per i limiti delle scale
let minLon, maxLon, minLat, maxLat;

// Variabile per memorizzare l'indice del vulcano selezionato (contiene l'oggetto TableRow)
let selectedVolcano = null;
let hoveredVolcano = null; // Variabile per tracciare il vulcano in hover

// Stato della legenda a tendina
let isLegendOpen = false;

// Variabili per il pulsante della legenda e del pulsante di chiusura della modale
let legendToggleRect = {};
let detailModalButtonRect = {};

// Mappa dei colori dinamica che verrà popolata in setup()
let volcanoColors = {};

// Costanti di stile
const VOLCANO_SIZE = 10;
const HOVER_COLOR = [255, 0, 0]; // Rosso (Riservato a hover e selezione)

// Colori di base definiti manualmente che avranno la precedenza
const predefinedColors = {
    // Tipi Sottomarini (come richiesto)
    "Submarine volcano": [0, 150, 255],  // Azzurro
    "Stratovolcano": [150, 75, 0],       // Marrone Scuro
    "Shield volcano": [0, 150, 0],       // Verde Scuro
    "Caldera": [255, 140, 0],            // Arancione Scuro
    "Sconosciuto": [50, 50, 50]          // Grigio Scuro (Default per tipi mancanti)
};

// Tavolozza di colori contrastanti per l'assegnazione dinamica
const fallbackColors = [
    [255, 105, 180], // Rosa Shocking
    [100, 100, 255], // Blu Medio
    [255, 200, 0],   // Giallo brillante
    [165, 42, 42],   // Marrone Rosso
    [0, 200, 200],   // Ciano
    [128, 0, 128],   // Viola
    [200, 100, 50],  // Arancio Mattone
    [180, 180, 180], // Grigio Chiaro
    [70, 130, 180],  // Blu Acciaio
    [50, 150, 150],  // Verde Acqua
    [255, 69, 0],    // Rosso-Arancio
];

// Array per tenere traccia dei tipi unici presenti nel dataset (per la legenda)
let uniqueTypes = new Set();


function preload() {
    // Carica il file CSV chiamato "vulcani.csv"
    data = loadTable("vulcani.csv", "csv", "header");
}

function setup() {
    createCanvas(windowWidth, windowHeight);
    noStroke();
    
    // --- DEFINIZIONE DELLE SCALE ---
    let allLon = data.getColumn("Longitude");
    minLon = min(allLon);
    maxLon = max(allLon);

    let allLat = data.getColumn("Latitude");
    minLat = min(allLat);
    maxLat = max(allLat);
    
    // --- MAPPATURA COLORI DINAMICA ---
    let colorIndex = 0;
    
    // 1. Popola i tipi unici e assegna i colori
    for (let i = 0; i < data.getRowCount(); i++) {
        let row = data.getRow(i);
        let tipo = row.getString("Type");
        
        if (tipo) {
            uniqueTypes.add(tipo);
            
            // Se il tipo non è ancora nella mappa (né predefinito né assegnato), assegna un colore
            if (!volcanoColors[tipo]) {
                if (predefinedColors[tipo]) {
                    // Usa il colore predefinito
                    volcanoColors[tipo] = predefinedColors[tipo];
                } else {
                    // Assegna dinamicamente un colore dalla tavolozza fallback
                    volcanoColors[tipo] = fallbackColors[colorIndex % fallbackColors.length];
                    colorIndex++;
                }
            }
        }
    }
    
    // Assicurati che il colore di fallback "Sconosciuto" sia definito
    volcanoColors["Sconosciuto"] = predefinedColors["Sconosciuto"];
}

function draw() {
    // Sfondo nero
    background(10);

    hoveredVolcano = null;
    let closestDist = Infinity;

    // --- FASE 1: Disegno dei Vulcani e Rilevamento Interattività ---
    for (let i = 0; i < data.getRowCount(); i++) {
        let row = data.getRow(i);
        
        let lon = row.getNum("Longitude");
        let lat = row.getNum("Latitude");
        let nome = row.getString("Volcano Name"); 
        let tipo = row.getString("Type");         
        
        // Mappatura delle coordinate
        let x = map(lon, minLon, maxLon, outerMargin, width - outerMargin);
        let y = map(lat, minLat, maxLat, height - outerMargin, outerMargin);

        // Calcola la distanza del mouse dal vulcano
        let d = dist(mouseX, mouseY, x, y);

        // Determina il colore di base
        let defaultColor = volcanoColors[tipo] || volcanoColors["Sconosciuto"];
        
        // Controlla se il mouse è sopra il vulcano
        let isHovering = d < VOLCANO_SIZE / 2;
        
        if (isHovering) {
            fill(HOVER_COLOR); // Rosso in hover
            if (d < closestDist) {
                closestDist = d;
                // Memorizza l'oggetto completo del vulcano (incluso il TableRow)
                hoveredVolcano = {
                    index: i,
                    x: x,
                    y: y,
                    row: row, // Salva l'oggetto TableRow completo
                    tipo: tipo
                };
            }
        } else if (selectedVolcano && selectedVolcano.index === i) {
             fill(HOVER_COLOR); // Rosso se è il vulcano selezionato (anche se la modale è chiusa)
        } else {
            fill(defaultColor); // Colore basato sulla categoria
        }

        // Disegna il triangolo
        triangle(
            x, y - VOLCANO_SIZE,             
            x - VOLCANO_SIZE / 2, y + VOLCANO_SIZE / 2, 
            x + VOLCANO_SIZE / 2, y + VOLCANO_SIZE / 2  
        );
    }
    
    // --- FASE 2: Disegno Titolo e Legende ---
    
    drawTitle("Mappa Interattiva dei Vulcani Globali (Classificazione: Tipo)");
    
    // Disegna la legenda a tendina
    drawLegendToggle();
    if (isLegendOpen) {
        drawLegendContent();
    }
    
    // --- FASE 3: Disegno Modale Dettaglio (Sostituisce il Pop-up piccolo) ---
    if (selectedVolcano) {
        drawDetailModal(selectedVolcano);
    }
}

// Funzione chiamata al momento del click del mouse
function mouseClicked() {
    // 1. GESTIONE CHIUSURA MODALE
    if (selectedVolcano) {
        // Controlla se è stato cliccato il pulsante di chiusura della modale
        if (mouseX > detailModalButtonRect.x && mouseX < detailModalButtonRect.x + detailModalButtonRect.w &&
            mouseY > detailModalButtonRect.y && mouseY < detailModalButtonRect.y + detailModalButtonRect.h) {
            selectedVolcano = null; // Chiude la modale
            return; 
        }
        // Se la modale è aperta, ignoriamo tutti gli altri click sulla mappa.
        return;
    }

    // 2. GESTIONE LEGENDA A TENDINA
    if (mouseX > legendToggleRect.x && mouseX < legendToggleRect.x + legendToggleRect.w &&
        mouseY > legendToggleRect.y && mouseY < legendToggleRect.y + legendToggleRect.h) {
        isLegendOpen = !isLegendOpen;
        return; 
    }

    // 3. GESTIONE SELEZIONE VULCANO (Solo se la modale è chiusa)
    if (hoveredVolcano) {
        selectedVolcano = { ...hoveredVolcano }; // Apre la modale con i dettagli
    }
}

// Funzione per disegnare il Titolo
function drawTitle(titleText) {
    fill(255);
    textAlign(CENTER, TOP);
    textSize(32);
    textStyle(BOLD);
    text(titleText, width / 2, 20);
    textStyle(NORMAL);
}

// Funzione per disegnare il pulsante di attivazione della legenda
function drawLegendToggle() {
    let padding = 20;
    let boxWidth = 240;
    let boxHeight = 40;
    let startX = width - boxWidth - padding;
    let startY = height - padding - boxHeight;

    // Aggiorna le dimensioni del rettangolo per il rilevamento del click
    legendToggleRect = { x: startX, y: startY, w: boxWidth, h: boxHeight };

    // Stile del pulsante
    let isHovering = mouseX > startX && mouseX < startX + boxWidth && 
                     mouseY > startY && mouseY < startY + boxHeight;

    fill(isHovering ? [50, 50, 50, 220] : [10, 10, 10, 220]); 
    rect(startX, startY, boxWidth, boxHeight, 5);

    // Testo del pulsante
    fill(255);
    textAlign(LEFT, CENTER);
    textSize(16);
    textStyle(BOLD);
    
    let indicator = isLegendOpen ? '▲' : '▼'; // Indicatore a tendina
    let textContent = "Legenda Categorie (Tipo) " + indicator;

    text(textContent, startX + 10, startY + boxHeight / 2);
    textStyle(NORMAL);
}

// Funzione per disegnare il contenuto dettagliato della legenda
function drawLegendContent() {
    let padding = 20;
    let boxWidth = 240;
    let itemHeight = 20;
    let titleHeight = 5; 
    
    // Calcola l'altezza totale necessaria per tutti i tipi unici + la voce hover
    let contentHeight = (uniqueTypes.size + 1) * itemHeight + titleHeight;
    
    // Posizione di partenza per il contenuto (sopra il pulsante)
    let startX = width - boxWidth - padding;
    let startY = height - padding - legendToggleRect.h - contentHeight; 
    
    // Sfondo semi-trasparente per la legenda
    fill(10, 10, 10, 200);
    rect(startX, startY, boxWidth, contentHeight + 10, 5);

    let currentY = startY + 10;
    let i = 0;
    
    // La Set 'uniqueTypes' contiene solo i tipi presenti nel dataset
    Array.from(uniqueTypes).sort().forEach(tipo => {
        let colorArray = volcanoColors[tipo] || volcanoColors["Sconosciuto"];
        
        // Disegna il campione di colore (quadrato)
        fill(colorArray);
        rect(startX + 10, currentY + i * itemHeight, 15, 15);
        
        // Scrivi il nome della categoria
        fill(255);
        textSize(12);
        textAlign(LEFT, TOP);
        text(tipo, startX + 35, currentY + i * itemHeight + 2);
        
        i++;
    });
    
    // Aggiungi l'indicazione per Hover/Select
    fill(HOVER_COLOR);
    rect(startX + 10, currentY + i * itemHeight, 15, 15);
    fill(255);
    text("Hover / Selezionato", startX + 35, currentY + i * itemHeight + 2);
}

// Nuova funzione per disegnare la modale di dettaglio
function drawDetailModal(volcano) {
    // Il colore del vulcano selezionato per l'accento
    let accentColor = volcanoColors[volcano.tipo] || volcanoColors["Sconosciuto"];
    
    // Dimensioni e posizione della modale
    let modalWidth = min(width * 0.7, 700);
    let modalHeight = min(height * 0.8, 800);
    let modalX = width / 2 - modalWidth / 2;
    let modalY = height / 2 - modalHeight / 2;
    let contentX = modalX + 30;
    let contentY = modalY + 30;
    let lineHeight = 25;

    // 1. Sfondo semi-trasparente
    fill(0, 0, 0, 180);
    rect(0, 0, width, height);

    // 2. Pannello principale (modale)
    fill(30); 
    rect(modalX, modalY, modalWidth, modalHeight, 10);
    
    // 3. Titolo
    fill(accentColor);
    rect(modalX, modalY, modalWidth, 50, 10, 10, 0, 0); // Barra titolo accentata
    
    fill(255);
    textSize(20);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text("Dettagli del Vulcano: " + volcano.row.getString("Volcano Name"), modalX + modalWidth / 2, modalY + 25);
    textStyle(NORMAL);
    
    // 4. Contenuto dei dati
    fill(220);
    textSize(14);
    textAlign(LEFT, TOP);

    let currentRow = volcano.row;
    let keys = data.columns;
    let currentLineY = contentY + 30;
    
    // Scorri tutte le colonne del CSV e visualizza il nome del campo e il valore
    for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        let value = currentRow.getString(key);
        
        // Evidenzia il nome del campo
        textStyle(BOLD);
        text(key + ":", contentX, currentLineY);
        
        // Evidenzia il valore del campo
        textStyle(NORMAL);
        // Calcola la posizione per allineare il valore a destra del campo
        let keyWidth = textWidth(key + ":");
        text(value, contentX + keyWidth + 10, currentLineY);
        
        currentLineY += lineHeight;
        
        // Se il contenuto supera l'altezza della modale, potremmo interrompere qui o rendere scorrevole (più complesso in p5.js)
        if (currentLineY > modalY + modalHeight - 70) {
            fill(255, 0, 0);
            text("...", contentX, currentLineY);
            break; 
        }
    }
    
    // 5. Pulsante Chiudi
    let buttonWidth = 120;
    let buttonHeight = 40;
    let buttonX = modalX + modalWidth - buttonWidth - 20;
    let buttonY = modalY + modalHeight - buttonHeight - 20;
    
    // Aggiorna l'area del pulsante per la gestione del click
    detailModalButtonRect = { x: buttonX, y: buttonY, w: buttonWidth, h: buttonHeight };

    // Disegna il pulsante
    let isHovering = mouseX > buttonX && mouseX < buttonX + buttonWidth && 
                     mouseY > buttonY && mouseY < buttonY + buttonHeight;

    fill(isHovering ? [accentColor[0] + 50, accentColor[1] + 50, accentColor[2] + 50] : accentColor); 
    rect(buttonX, buttonY, buttonWidth, buttonHeight, 5);

    // Testo del pulsante
    fill(0);
    textSize(16);
    textAlign(CENTER, CENTER);
    textStyle(BOLD);
    text("Chiudi", buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);
}
