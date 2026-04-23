let parsedLyrics = []; // [{ time: seconds, text: string }]

function loadLRC(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            parsedLyrics = parseLRC(e.target.result);
            resolve(parsedLyrics);
        };
        reader.readAsText(file);
    });
}

function parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    let parsed = [];
    let phrases = [];
    let currentPhrase = [];

    // Step 1: Group LRC lines into phrases (broken by empty timestamps)
    for (let line of lines) {
        let match = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
        if (match) {
            let word = match[3].trim();
            let time = parseInt(match[1]) * 60 + parseFloat(match[2]);
            
            if (word === "") {
                if (currentPhrase.length > 0) phrases.push(currentPhrase);
                currentPhrase = [];
                // Push a reset marker
                parsed.push({ time: time, text: "", fullLine: "", isReset: true });
            } else {
                currentPhrase.push({ time: time, word: word });
            }
        }
    }
    if (currentPhrase.length > 0) phrases.push(currentPhrase);

    // Step 2: Build the cumulative data with "Full Line" knowledge
    for (let phrase of phrases) {
        let fullLineText = phrase.map(p => p.word).join(" ");
        let cumulative = "";
        for (let i = 0; i < phrase.length; i++) {
            let old = cumulative;
            cumulative = (cumulative === "") ? phrase[i].word : cumulative + " " + phrase[i].word;
            parsed.push({
                time: phrase[i].time,
                text: cumulative,
                fullLine: fullLineText,
                newWord: phrase[i].word,
                prev: old
            });
        }
    }
    
    // Sort by time just in case
    return parsed.sort((a, b) => a.time - b.time);
}

function getCurrentLyricLine(currentTime) {
    if (!parsedLyrics.length) return null;
    let current = null;
    for (const line of parsedLyrics) {
        if (currentTime >= line.time) current = line;
        else break;
    }
    return current;
}