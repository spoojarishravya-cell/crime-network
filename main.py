from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader

import re
import io


# =====================================================
# FASTAPI
# =====================================================

app = FastAPI(
    title="CrimeGraph AI",
    description="AI Powered Criminal Network Analysis System",
    version="2.0"
)


# =====================================================
# CORS
# =====================================================

app.add_middleware(
    CORSMiddleware,

    allow_origins=["*"],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"]
)


# =====================================================
# DATA MODEL
# =====================================================

class AnalysisRequest(BaseModel):

    case_name: str

    text: str


# =====================================================
# FILE TEXT EXTRACTION
# =====================================================

def extract_text_from_pdf(file_bytes):

    pdf_file = io.BytesIO(file_bytes)

    reader = PdfReader(pdf_file)

    text = ""

    for page in reader.pages:

        page_text = page.extract_text()

        if page_text:

            text += page_text + "\n"

    return text


def extract_text_from_file(
    filename,
    file_bytes
):

    filename_lower = filename.lower()


    # PDF

    if filename_lower.endswith(".pdf"):

        return extract_text_from_pdf(
            file_bytes
        )


    # TXT / FIR

    if (
        filename_lower.endswith(".txt")
        or filename_lower.endswith(".fir")
    ):

        return file_bytes.decode(
            "utf-8",
            errors="ignore"
        )


    raise ValueError(
        "Unsupported file type. "
        "Please upload PDF, TXT or FIR."
    )


# =====================================================
# ENTITY EXTRACTION
# =====================================================

def extract_phone_numbers(text):

    pattern = r"\b[6-9]\d{9}\b"

    return list(
        dict.fromkeys(
            re.findall(pattern, text)
        )
    )


def extract_vehicles(text):

    pattern = (
        r"\b[A-Z]{2}"
        r"[- ]?\d{1,2}"
        r"[- ]?[A-Z]{1,3}"
        r"[- ]?\d{3,4}\b"
    )

    vehicles = re.findall(
        pattern,
        text.upper()
    )

    return list(
        dict.fromkeys(vehicles)
    )


def extract_dates(text):

    patterns = [

        r"\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b",

        r"\b\d{1,2}\s+"
        r"(?:January|February|March|April|May|June|July|"
        r"August|September|October|November|December)"
        r"\s+\d{4}\b",

        r"\b(?:January|February|March|April|May|June|July|"
        r"August|September|October|November|December)"
        r"\s+\d{1,2},?\s+\d{4}\b"

    ]

    dates = []

    for pattern in patterns:

        dates.extend(
            re.findall(
                pattern,
                text,
                flags=re.IGNORECASE
            )
        )

    return list(
        dict.fromkeys(dates)
    )


def extract_people(text):

    """
    Simple prototype person extraction.

    Looks for names such as:

    Rahul Sharma
    Sameer Khan
    Arjun Rao

    It also supports Mr/Ms/Dr prefixes.
    """

    pattern = (
        r"\b(?:Mr\.?|Ms\.?|Mrs\.?|Dr\.?)?\s*"
        r"[A-Z][a-z]{2,}"
        r"(?:\s+[A-Z][a-z]{2,}){1,2}\b"
    )

    matches = re.findall(
        pattern,
        text
    )


    people = []

    for match in matches:

        name = match.strip()

        # Remove titles

        name = re.sub(
            r"^(Mr\.?|Ms\.?|Mrs\.?|Dr\.?)\s+",
            "",
            name,
            flags=re.IGNORECASE
        )

        # Ignore obvious non-person phrases

        ignored = {

            "Crime Investigation",

            "Police Station",

            "Railway Station",

            "First Information",

            "Case Investigation",

            "Investigation Report",

            "Indian Penal",

            "Motor Vehicle"

        }


        if name not in ignored:

            if name not in people:

                people.append(name)


    return people


def extract_locations(text):

    """
    Looks for locations following common location words.
    """

    patterns = [

        r"(?:near|at|in|from|to|outside|inside)"
        r"\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,3})",

    ]


    locations = []


    for pattern in patterns:

        matches = re.findall(
            pattern,
            text
        )

        for location in matches:

            location = location.strip(
                " .,;"
            )


            if len(location) > 2:

                if location not in locations:

                    locations.append(
                        location
                    )


    # Common locations that may occur without
    # "near / at / in"

    common_locations = [

        "MG Road",

        "Bangalore",

        "Bengaluru",

        "Mumbai",

        "Delhi",

        "Chennai",

        "Hyderabad",

        "Pune",

        "Kolkata",

        "Koramangala",

        "Whitefield",

        "Indiranagar",

        "Railway Station",

        "Police Station"

    ]


    text_lower = text.lower()


    for location in common_locations:

        if location.lower() in text_lower:

            if location not in locations:

                locations.append(
                    location
                )


    return locations


def extract_organizations(text):

    patterns = [

        r"\b[A-Z][A-Za-z]+"
        r"\s+(?:Police|Bank|Company|Corporation|Ltd|Limited)\b",

        r"\b(?:Police|Bank|Company|Corporation)"
        r"\s+[A-Z][A-Za-z]+\b"

    ]


    organizations = []


    for pattern in patterns:

        matches = re.findall(
            pattern,
            text
        )

        for item in matches:

            item = item.strip()

            if item not in organizations:

                organizations.append(item)


    return organizations


# =====================================================
# RELATIONSHIPS
# =====================================================

def create_relationships(
    text,
    people,
    locations,
    vehicles,
    phones
):

    relationships = []


    sentences = re.split(
        r"[.!?\n]",
        text
    )


    for sentence in sentences:

        sentence_lower = sentence.lower()


        people_found = [

            person

            for person in people

            if person.lower()
            in sentence_lower

        ]


        locations_found = [

            location

            for location in locations

            if location.lower()
            in sentence_lower

        ]


        vehicles_found = [

            vehicle

            for vehicle in vehicles

            if vehicle.lower()
            in sentence.upper()

        ]


        phones_found = [

            phone

            for phone in phones

            if phone in sentence

        ]


        # -----------------------------------------
        # PERSON -> PERSON
        # -----------------------------------------

        if len(people_found) >= 2:

            relation = "ASSOCIATED"

            if "met" in sentence_lower:

                relation = "MET"

            elif "called" in sentence_lower:

                relation = "CALLED"

            elif "contacted" in sentence_lower:

                relation = "CONTACTED"

            elif "visited" in sentence_lower:

                relation = "VISITED"


            for i in range(
                len(people_found)
            ):

                for j in range(
                    i + 1,
                    len(people_found)
                ):

                    relationships.append({

                        "source":
                            people_found[i],

                        "target":
                            people_found[j],

                        "type":
                            relation

                    })


        # -----------------------------------------
        # PERSON -> LOCATION
        # -----------------------------------------

        for person in people_found:

            for location in locations_found:

                relationships.append({

                    "source":
                        person,

                    "target":
                        location,

                    "type":
                        "LOCATION"

                })


        # -----------------------------------------
        # PERSON -> VEHICLE
        # -----------------------------------------

        for person in people_found:

            for vehicle in vehicles_found:

                relationships.append({

                    "source":
                        person,

                    "target":
                        vehicle,

                    "type":
                        "USED VEHICLE"

                })


        # -----------------------------------------
        # PERSON -> PHONE
        # -----------------------------------------

        for person in people_found:

            for phone in phones_found:

                relationships.append({

                    "source":
                        person,

                    "target":
                        phone,

                    "type":
                        "PHONE"

                })


    # Remove duplicates

    unique_relationships = []


    for relationship in relationships:

        if relationship not in unique_relationships:

            unique_relationships.append(
                relationship
            )


    return unique_relationships


# =====================================================
# ANALYZE TEXT
# =====================================================

def analyze_text(text):

    people = extract_people(text)

    locations = extract_locations(text)

    vehicles = extract_vehicles(text)

    phones = extract_phone_numbers(text)

    dates = extract_dates(text)

    organizations = extract_organizations(text)


    # -----------------------------------------
    # ENTITIES
    # -----------------------------------------

    entities = []


    for person in people:

        entities.append({

            "name":
                person,

            "type":
                "PERSON"

        })


    for location in locations:

        entities.append({

            "name":
                location,

            "type":
                "LOCATION"

        })


    for vehicle in vehicles:

        entities.append({

            "name":
                vehicle,

            "type":
                "VEHICLE"

        })


    for phone in phones:

        entities.append({

            "name":
                phone,

            "type":
                "PHONE"

        })


    for date in dates:

        entities.append({

            "name":
                date,

            "type":
                "DATE"

        })


    for organization in organizations:

        entities.append({

            "name":
                organization,

            "type":
                "ORGANIZATION"

        })


    # -----------------------------------------
    # RELATIONSHIPS
    # -----------------------------------------

    relationships = create_relationships(

        text,

        people,

        locations,

        vehicles,

        phones

    )


    # -----------------------------------------
    # GRAPH
    # -----------------------------------------

    nodes = []


    for entity in entities:

        nodes.append({

            "id":
                entity["name"],

            "name":
                entity["name"],

            "type":
                entity["type"]

        })


    graph = {

        "nodes":
            nodes,

        "links":
            relationships

    }


    # -----------------------------------------
    # INSIGHTS
    # -----------------------------------------

    insights = []


    connection_count = {}


    for relationship in relationships:

        source = relationship["source"]

        target = relationship["target"]


        connection_count[source] = (
            connection_count.get(
                source,
                0
            ) + 1
        )


        connection_count[target] = (
            connection_count.get(
                target,
                0
            ) + 1
        )


    if connection_count:

        key_person = max(

            connection_count,

            key=connection_count.get

        )


        count = connection_count[
            key_person
        ]


        insights.append({

            "title":
                "Potential Network Hub",

            "description":
                f"{key_person} has "
                f"{count} detected "
                f"connections. This "
                f"may indicate an "
                f"important network "
                f"position and should "
                f"be reviewed by an "
                f"investigator."

        })


    if len(people) >= 3:

        insights.append({

            "title":
                "Multiple Persons Detected",

            "description":
                f"The system identified "
                f"{len(people)} people "
                f"in the supplied data."

        })


    if len(locations) >= 2:

        insights.append({

            "title":
                "Multiple Locations",

            "description":
                f"{len(locations)} locations "
                f"were identified. "
                f"Investigators can "
                f"review movement "
                f"patterns between "
                f"these locations."

        })


    if len(vehicles) > 0:

        insights.append({

            "title":
                "Vehicle Identified",

            "description":
                f"{len(vehicles)} vehicle "
                f"identifier(s) were "
                f"detected in the "
                f"investigation data."

        })


    return {

        "entities":
            entities,

        "relationships":
            relationships,

        "insights":
            insights,

        "graph":
            graph,

        "statistics": {

            "people":
                len(people),

            "locations":
                len(locations),

            "vehicles":
                len(vehicles),

            "phones":
                len(phones),

            "dates":
                len(dates),

            "organizations":
                len(organizations)

        }

    }


# =====================================================
# HOME
# =====================================================

@app.get("/")
def root():

    return {

        "message":
            "CrimeGraph AI Backend is running",

        "version":
            "2.0"

    }


# =====================================================
# HEALTH
# =====================================================

@app.get("/health")
def health():

    return {

        "status":
            "healthy"

    }


# =====================================================
# ANALYZE PASTED TEXT
# =====================================================

@app.post("/analyze")
def analyze(
    request: AnalysisRequest
):

    result = analyze_text(
        request.text
    )


    result["case_name"] = (
        request.case_name
    )


    return result


# =====================================================
# UPLOAD FILE
# =====================================================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...)
):

    filename = file.filename


    # Check file type

    allowed_extensions = (

        ".pdf",

        ".txt",

        ".fir"

    )


    if not filename.lower().endswith(
        allowed_extensions
    ):

        return {

            "success":
                False,

            "error":
                "Unsupported file type. "
                "Please upload PDF, TXT or FIR."

        }


    # Read uploaded file

    file_bytes = await file.read()


    try:

        extracted_text = (
            extract_text_from_file(
                filename,
                file_bytes
            )
        )


    except Exception as error:

        return {

            "success":
                False,

            "error":
                str(error)

        }


    if not extracted_text.strip():

        return {

            "success":
                False,

            "error":
                "No readable text was found "
                "in this file. If this is a "
                "scanned PDF, OCR will be needed."

        }


    # Analyze extracted text

    result = analyze_text(
        extracted_text
    )


    result["success"] = True

    result["filename"] = filename

    result["extracted_text"] = (
        extracted_text
    )


    return result