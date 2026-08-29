const API_URL = "http://localhost:8000";


/* =========================
   LOAD DEMO DATA
========================= */

function loadDemoData() {

    document.getElementById("caseName").value =
        "Organized Theft Investigation";


    document.getElementById("reportText").value =

`Rahul Sharma met Sameer Khan near MG Road on 12 August.

Sameer Khan was using vehicle KA01AB1234.

Rahul called Sameer on phone 9876543210.

Sameer later met Arjun Rao near Bangalore Railway Station.

Arjun Rao contacted Vikram Singh.

Sameer and Arjun visited MG Road several times.

Rahul and Sameer were seen together near MG Road.`;

}


/* =========================
   ANALYZE INVESTIGATION
========================= */

async function analyzeInvestigation() {

    const caseName =
        document.getElementById("caseName").value.trim();


    const reportText =
        document.getElementById("reportText").value.trim();


    const loading =
        document.getElementById("loading");


    const error =
        document.getElementById("errorMessage");


    if (!reportText) {

        showError(
            "Please enter an investigation report first."
        );

        return;

    }


    loading.classList.remove("hidden");

    error.classList.add("hidden");


    try {

        const response = await fetch(
            `${API_URL}/analyze`,
            {

                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    case_name:
                        caseName ||
                        "Demo Investigation",

                    text:
                        reportText

                })

            }
        );


        if (!response.ok) {

            throw new Error(
                "Backend returned an error."
            );

        }


        const data =
            await response.json();


        displayResults(data);


    }

    catch (err) {

        console.error(err);

        showError(
            "Could not connect to the backend. Make sure FastAPI is running on port 8000."
        );

    }

    finally {

        loading.classList.add("hidden");

    }

}


/* =========================
   DISPLAY RESULTS
========================= */

function displayResults(data) {

    const resultsSection =
        document.getElementById(
            "resultsSection"
        );


    resultsSection.classList.remove(
        "hidden"
    );


    document.getElementById(
        "entityCount"
    ).textContent =
        data.entities.length;


    document.getElementById(
        "relationshipCount"
    ).textContent =
        data.relationships.length;


    document.getElementById(
        "networkCount"
    ).textContent =
        `${data.relationships.length} relationships`;


    displayEntities(
        data.entities
    );


    displayInsights(
        data.insights
    );


    displayRelationships(
        data.relationships
    );


    drawNetwork(
        data.graph
    );


    resultsSection.scrollIntoView({
        behavior: "smooth"
    });
updateAISummary(data);
}
function updateAISummary(data) {

    const entities = data.entities || [];

    const people = entities.filter(
        entity => entity.type === "PERSON"
    );

    const locations = entities.filter(
        entity => entity.type === "LOCATION"
    );

    const vehicles = entities.filter(
        entity => entity.type === "VEHICLE"
    );

    const phones = entities.filter(
        entity => entity.type === "PHONE"
    );


    const relationships =
        data.relationships || [];

    // FIND POTENTIAL KEY INDIVIDUAL
const personConnections = {};

relationships.forEach(rel => {
    const source = rel.source;
    const target = rel.target;

    if (source) {
        personConnections[source] =
            (personConnections[source] || 0) + 1;
    }

    if (target) {
        personConnections[target] =
            (personConnections[target] || 0) + 1;
    }
});

let keyPerson = null;
let maxConnections = 0;

people.forEach(person => {
    const name = person.text || person.name || person.value;

    if (name && personConnections[name] > maxConnections) {
        keyPerson = name;
        maxConnections = personConnections[name];
    }
});

const keyNameElement =
    document.getElementById("keyIndividualName");

const keyDetailsElement =
    document.getElementById("keyIndividualDetails");

if (keyPerson) {
    keyNameElement.textContent = keyPerson;

    keyDetailsElement.textContent =
        `${keyPerson} appears to have ${maxConnections} connections in the investigation network.`;
} else {
    keyNameElement.textContent =
        "No key individual detected yet.";

    keyDetailsElement.textContent =
        "Upload and analyze an investigation file to identify the most connected person.";
}
    document.getElementById(
        "summaryPeople"
    ).textContent = people.length;


    document.getElementById(
        "summaryLocations"
    ).textContent = locations.length;


    document.getElementById(
        "summaryVehicles"
    ).textContent = vehicles.length;


    document.getElementById(
        "summaryPhones"
    ).textContent = phones.length;


    document.getElementById(
        "summaryRelationships"
    ).textContent = relationships.length;


    const insight =
        document.getElementById(
            "mainAIInsight"
        );


    if (people.length > 0) {

        insight.textContent =
            `The system identified ${people.length} people, ` +
            `${locations.length} locations, ` +
            `${vehicles.length} vehicles and ` +
            `${phones.length} phone numbers ` +
            `from the uploaded investigation file.`;

    } else {

        insight.textContent =
            "No significant entities were detected in the uploaded file.";

    
    // Suspicious pattern analysis
    const patternBox = document.getElementById("patternAnalysis");

    if (patternBox) {
        const patterns = [];

        if (people.length >= 3) {
            patterns.push(
                "Multiple persons detected in the investigation."
            );
        }

        if (locations.length >= 2) {
            patterns.push(
                "Activity is associated with multiple locations."
            );
        }

        if (vehicles.length >= 2) {
            patterns.push(
                "Multiple vehicles are mentioned in the investigation."
            );
        }

        if (phones.length >= 2) {
            patterns.push(
                "Multiple phone identifiers were detected."
            );
        }

        if (relationships.length >= 3) {
            patterns.push(
                "A connected relationship network was detected."
            );
        }

        if (patterns.length === 0) {
            patternBox.innerHTML =
                "<p>No suspicious patterns detected yet.</p>";
        } else {
            patternBox.innerHTML = patterns
                .map(pattern => `<p>⚠️ ${pattern}</p>`)
                .join("");
        }
    }
 }
}

/* =========================
   DISPLAY ENTITIES
========================= */

function displayEntities(
    entities
) {

    const container =
        document.getElementById(
            "entityList"
        );


    container.innerHTML = "";


    entities.forEach(
        entity => {

            let icon = "E";


            if (entity.type === "PERSON")
                icon = "P";


            if (entity.type === "LOCATION")
                icon = "L";


            if (entity.type === "VEHICLE")
                icon = "V";


            if (entity.type === "PHONE")
                icon = "T";


            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "entity-item";


            item.innerHTML = `

                <div class="entity-icon">
                    ${icon}
                </div>

                <div>

                    <div class="entity-name">
                        ${escapeHtml(entity.name)}
                    </div>

                    <div class="entity-type">
                        ${entity.type}
                    </div>

                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================
   DISPLAY INSIGHTS
========================= */

function displayInsights(
    insights
) {

    const container =
        document.getElementById(
            "insightList"
        );


    container.innerHTML = "";


    if (insights.length === 0) {

        container.innerHTML = `

            <div class="insight">

                <div class="insight-icon">
                    ✓
                </div>

                <div>

                    <div class="insight-title">
                        No major pattern detected
                    </div>

                    <div class="insight-description">
                        More investigation data may be required.
                    </div>

                </div>

            </div>

        `;

        return;

    }


    insights.forEach(
        insight => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "insight";


            item.innerHTML = `

                <div class="insight-icon">
                    ⚠
                </div>

                <div>

                    <div class="insight-title">
                        ${escapeHtml(insight.title)}
                    </div>

                    <div class="insight-description">
                        ${escapeHtml(insight.description)}
                    </div>

                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================
   DISPLAY RELATIONSHIPS
========================= */

function displayRelationships(
    relationships
) {

    const container =
        document.getElementById(
            "relationshipList"
        );


    container.innerHTML = "";


    relationships.forEach(
        relationship => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "relationship";


            item.innerHTML = `

                <div class="relationship-node">
                    ${escapeHtml(
                        relationship.source
                    )}
                </div>

                <div class="relationship-type">
                    ${escapeHtml(
                        relationship.type
                    )}
                </div>

                <div class="relationship-node">
                    ${escapeHtml(
                        relationship.target
                    )}
                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================
   NETWORK GRAPH
========================= */

function drawNetwork(
    graph
) {

    const canvas =
        document.getElementById(
            "networkCanvas"
        );


    const container =
        canvas.parentElement;


    const width =
        container.clientWidth;


    const height =
        container.clientHeight;


    const dpr =
        window.devicePixelRatio || 1;


    canvas.width =
        width * dpr;


    canvas.height =
        height * dpr;


    canvas.style.width =
        `${width}px`;


    canvas.style.height =
        `${height}px`;


    const ctx =
        canvas.getContext("2d");


    ctx.scale(dpr, dpr);


    /*
        Create positions for nodes
    */

    const nodes =
        graph.nodes.map(
            (node, index) => {

                const angle =
                    (index /
                        graph.nodes.length) *
                    Math.PI *
                    2;


                const radius =
                    Math.min(
                        width,
                        height
                    ) * 0.28;


                return {

                    ...node,

                    x:
                        width / 2 +
                        Math.cos(angle) *
                        radius,

                    y:
                        height / 2 +
                        Math.sin(angle) *
                        radius

                };

            }
        );


    function getNode(
        name
    ) {

        return nodes.find(
            node =>
                node.id === name
        );

    }


    function render() {

        ctx.clearRect(
            0,
            0,
            width,
            height
        );


        /*
            Draw relationships
        */

        graph.links.forEach(
            link => {

                const source =
                    getNode(
                        link.source
                    );


                const target =
                    getNode(
                        link.target
                    );


                if (!source ||
                    !target)
                    return;


                ctx.beginPath();


                ctx.moveTo(
                    source.x,
                    source.y
                );


                ctx.lineTo(
                    target.x,
                    target.y
                );


                ctx.strokeStyle =
                    "#3b3c4a";


                ctx.lineWidth =
                    1.5;


                ctx.stroke();


                /*
                    Relationship label
                */

                const midX =
                    (source.x +
                        target.x) / 2;


                const midY =
                    (source.y +
                        target.y) / 2;


                ctx.fillStyle =
                    "#77798a";


                ctx.font =
                    "9px Arial";


                ctx.textAlign =
                    "center";


                ctx.fillText(
                    link.type,
                    midX,
                    midY - 5
                );

            }
        );


        /*
            Draw nodes
        */

        nodes.forEach(
            node => {

                ctx.beginPath();


                ctx.arc(
                    node.x,
                    node.y,
                    12,
                    0,
                    Math.PI * 2
                );


                ctx.fillStyle =
                    "#6d5dfc";


                ctx.fill();


                ctx.strokeStyle =
                    "#aaa2ff";


                ctx.lineWidth =
                    2;


                ctx.stroke();


                /*
                    Node name
                */

                ctx.fillStyle =
                    "#eeeeF5";


                ctx.font =
                    "11px Arial";


                ctx.textAlign =
                    "center";


                ctx.fillText(
                    node.name,
                    node.x,
                    node.y + 30
                );

            }
        );

    }


    render();

}


/* =========================
   ERROR
========================= */

function showError(
    message
) {

    const error =
        document.getElementById(
            "errorMessage"
        );


    error.textContent =
        message;


    error.classList.remove(
        "hidden"
    );

}


/* =========================
   SECURITY
========================= */

function escapeHtml(
    text
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        text;


    return div.innerHTML;

}
/* =========================
   FILE UPLOAD
========================= */

async function uploadInvestigationFile() {

    const fileInput =
        document.getElementById(
            "fileInput"
        );


    const selectedFile =
        document.getElementById(
            "selectedFile"
        );


    const loading =
        document.getElementById(
            "loading"
        );


    const error =
        document.getElementById(
            "errorMessage"
        );


    if (!fileInput.files.length) {

        showError(
            "Please choose a PDF, TXT or FIR file."
        );

        return;

    }


    const file =
        fileInput.files[0];


    selectedFile.textContent =
        `Selected: ${file.name}`;


    const formData =
        new FormData();


    formData.append(
        "file",
        file
    );


    loading.textContent =
        "📄 Reading file and extracting investigation data...";


    loading.classList.remove(
        "hidden"
    );


    error.classList.add(
        "hidden"
    );


    try {

        const response =
            await fetch(
                `${API_URL}/upload`,
                {

                    method: "POST",

                    body: formData

                }
            );


        const data =
            await response.json();


        if (!response.ok ||
            data.success === false) {

            throw new Error(
                data.error ||
                "File analysis failed."
            );

        }


        /*
            Show extracted text
            in the report box.
        */

        document.getElementById(
            "reportText"
        ).value =
            data.extracted_text;


        /*
            Display the
            investigation results.
        */

        displayResults(data);


    }

    catch (err) {

        console.error(err);


        showError(
            err.message
        );

    }

    finally {

        loading.classList.add(
            "hidden"
        );

    }

}