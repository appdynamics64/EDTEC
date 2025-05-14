from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
import fitz  # PyMuPDF
import os
import shutil
import json
import uuid
from pathlib import Path
from pdf2image import convert_from_bytes
import cv2
import numpy as np
from PIL import Image
import io
import zipfile
from tempfile import NamedTemporaryFile
import platform

router = APIRouter()

# Create a temporary directory for outputs
TEMP_DIR = Path("./temp_extraction")
TEMP_DIR.mkdir(exist_ok=True)

@router.post("/extract")
async def extract_document(file: UploadFile = File(...)):
    """
    Extract text, images, and objects from a PDF or image file.
    Returns a ZIP file containing the extracted content.
    """
    # Generate a unique ID for this extraction
    extraction_id = str(uuid.uuid4())
    extraction_dir = TEMP_DIR / extraction_id
    extraction_dir.mkdir()
    
    # Set up directories for output
    images_dir = extraction_dir / "images"
    images_dir.mkdir()
    
    try:
        # Read the file content
        file_content = await file.read()
        
        # Extract filename and extension
        filename = file.filename
        file_extension = Path(filename).suffix.lower()
        
        # Structure to store extraction results
        document_data = {
            "document": filename,
            "pages": []
        }
        
        try:
            if file_extension == ".pdf":
                # Process PDF
                document_data = extract_from_pdf(file_content, images_dir, document_data)
            elif file_extension in [".jpg", ".jpeg", ".png"]:
                # Process image
                document_data = extract_from_image(file_content, images_dir, document_data)
            else:
                raise HTTPException(status_code=400, detail="Unsupported file format")
            
            # Save the JSON output
            json_path = extraction_dir / "output.json"
            with open(json_path, "w") as f:
                json.dump(document_data, f, indent=2)
            
            # Create ZIP file
            zip_path = extraction_dir / f"{Path(filename).stem}_extracted.zip"
            with zipfile.ZipFile(zip_path, "w") as zipf:
                # Add the JSON file
                zipf.write(json_path, "output.json")
                
                # Add all image files
                for img_file in images_dir.glob("*"):
                    zipf.write(img_file, f"images/{img_file.name}")
            
            # Return the ZIP file
            return FileResponse(
                path=zip_path,
                filename=zip_path.name,
                media_type="application/zip"
            )
        
        except Exception as e:
            import traceback
            error_details = traceback.format_exc()
            print(f"Extraction error details: {error_details}")
            raise HTTPException(status_code=500, detail=f"Error during extraction: {str(e)}\n{error_details}")
    
    except Exception as e:
        # Clean up if there's an error
        if extraction_dir.exists():
            shutil.rmtree(extraction_dir)
        import traceback
        error_details = traceback.format_exc()
        print(f"Upload error details: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error processing upload: {str(e)}\n{error_details}")
    
    finally:
        # Clean up extracted files after sending response
        def cleanup_task():
            try:
                if extraction_dir.exists():
                    shutil.rmtree(extraction_dir)
            except Exception as e:
                print(f"Cleanup error: {str(e)}")
        
        # Schedule cleanup to run after response is sent
        # This would normally use BackgroundTasks in FastAPI, but for simplicity we'll use a delayed approach

@router.post("/extract-simple")
async def extract_document_simple(file: UploadFile = File(...)):
    """
    Simple test endpoint that just returns a basic ZIP with the uploaded file.
    """
    # Generate a unique ID for this extraction
    extraction_id = str(uuid.uuid4())
    extraction_dir = TEMP_DIR / extraction_id
    extraction_dir.mkdir()
    
    try:
        # Read the file content
        file_content = await file.read()
        
        # Save the original file
        original_path = extraction_dir / file.filename
        with open(original_path, "wb") as f:
            f.write(file_content)
        
        # Create a simple JSON
        json_path = extraction_dir / "info.json"
        with open(json_path, "w") as f:
            json.dump({"filename": file.filename, "size": len(file_content)}, f)
        
        # Create ZIP file
        zip_path = extraction_dir / f"simple_extracted.zip"
        with zipfile.ZipFile(zip_path, "w") as zipf:
            zipf.write(json_path, "info.json")
            zipf.write(original_path, file.filename)
        
        # Return the ZIP file
        return FileResponse(
            path=zip_path,
            filename=zip_path.name,
            media_type="application/zip"
        )
    
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Simple extraction error: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error in simple extraction: {str(e)}")
    
    finally:
        # Clean up extracted files after sending response
        if extraction_dir.exists():
            shutil.rmtree(extraction_dir)

def extract_from_pdf(pdf_content, images_dir, document_data):
    """Extract content from a PDF file"""
    # Open the PDF with PyMuPDF
    with fitz.open(stream=pdf_content, filetype="pdf") as doc:
        for page_num, page in enumerate(doc):
            # Create a page dictionary for this page
            page_data = {
                "number": page_num + 1,
                "text_blocks": [],
                "images": [],
                "objects": []
            }
            
            # Extract text blocks
            text_blocks = page.get_text("blocks")
            for i, block in enumerate(text_blocks):
                if block[6] == 0:  # Text block
                    page_data["text_blocks"].append({
                        "text": block[4],
                        "bbox": [block[0], block[1], block[2], block[3]]
                    })
            
            # Extract images
            if platform.system() == 'Windows':
                poppler_path = r"C:\path\to\poppler\bin"  # Update this path
                pages = convert_from_bytes(pdf_content, poppler_path=poppler_path)
            else:
                pages = convert_from_bytes(pdf_content)
            
            for i, img in enumerate(pages):
                xref = img[0]
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                
                # Save the image
                image_filename = f"page{page_num+1}_img{i+1}.{image_ext}"
                image_path = images_dir / image_filename
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
                
                # Add image info to JSON
                page_data["images"].append({
                    "filename": image_filename,
                    "bbox": page.get_image_bbox(img)
                })
            
            # Extract shapes/objects (vector graphics)
            paths = page.get_drawings()
            for i, path in enumerate(paths):
                # Basic object detection logic
                obj_type = detect_object_type(path)
                if obj_type:
                    page_data["objects"].append({
                        "type": obj_type,
                        "bbox": path["rect"]
                    })
            
            # Render page as an image for preview
            pix = page.get_pixmap(matrix=fitz.Matrix(300/72, 300/72))
            preview_filename = f"page{page_num+1}_preview.png"
            preview_path = images_dir / preview_filename
            pix.save(preview_path)
            
            # Add the page data to the document
            document_data["pages"].append(page_data)
    
    return document_data

def extract_from_image(image_content, images_dir, document_data):
    """Extract content from an image file"""
    # Open the image with PIL
    with Image.open(io.BytesIO(image_content)) as img:
        # Save the original image
        image_filename = "original.png"
        image_path = images_dir / image_filename
        img.save(image_path)
        
        # Convert to OpenCV format for processing
        cv_img = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        
        # Create a page dictionary for this image
        page_data = {
            "number": 1,
            "text_blocks": [],
            "images": [{"filename": image_filename, "bbox": [0, 0, img.width, img.height]}],
            "objects": []
        }
        
        # Detect objects in the image
        detected_objects = detect_objects_in_image(cv_img, images_dir)
        page_data["objects"] = detected_objects
        
        # TODO: Add OCR text detection with Tesseract
        # This would require installing tesseract and pytesseract
        
        # Add the page data to the document
        document_data["pages"].append(page_data)
    
    return document_data

def detect_object_type(path):
    """Detect the type of object from a vector path"""
    # This is a basic implementation - could be enhanced with ML
    rect = path["rect"]
    width = rect[2] - rect[0]
    height = rect[3] - rect[1]
    
    # Check if it's approximately square and has fill color
    if 0.9 <= width/height <= 1.1 and path.get("fill"):
        if width < 30:  # Small squares are often checkboxes or dice
            return "checkbox" if not path.get("fill_color") else "dice"
    
    # Check for arrows (typically longer in one dimension)
    elif (width > 3 * height or height > 3 * width) and len(path["items"]) <= 3:
        return "arrow"
    
    # Check for circles
    elif 0.9 <= width/height <= 1.1 and "o" in "".join([i[0] for i in path["items"] if isinstance(i, tuple)]):
        return "circle"
    
    return None

def detect_objects_in_image(cv_img, images_dir):
    """Detect objects in an image using OpenCV"""
    detected_objects = []
    
    # Convert to grayscale for processing
    gray = cv2.cvtColor(cv_img, cv2.COLOR_BGR2GRAY)
    
    # Detect circles using Hough Circle Transform
    circles = cv2.HoughCircles(
        gray, cv2.HOUGH_GRADIENT, dp=1, minDist=20,
        param1=50, param2=30, minRadius=10, maxRadius=40
    )
    
    if circles is not None:
        circles = np.uint16(np.around(circles))
        for i, (x, y, r) in enumerate(circles[0, :]):
            detected_objects.append({
                "type": "circle",
                "bbox": [int(x-r), int(y-r), int(x+r), int(y+r)]
            })
            
            # Extract the circle as an image
            circle_img = cv_img[max(0, y-r):min(cv_img.shape[0], y+r), max(0, x-r):min(cv_img.shape[1], x+r)]
            if circle_img.size > 0:
                circle_filename = f"circle_{i+1}.png"
                cv2.imwrite(str(images_dir / circle_filename), circle_img)
    
    # Detect rectangles/squares (potential checkboxes or dice)
    _, threshold = cv2.threshold(gray, 127, 255, 0)
    contours, _ = cv2.findContours(threshold, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
    
    for i, contour in enumerate(contours):
        approx = cv2.approxPolyDP(contour, 0.01 * cv2.arcLength(contour, True), True)
        
        # Check if it's a rectangle (4 vertices)
        if len(approx) == 4:
            x, y, w, h = cv2.boundingRect(approx)
            
            # Skip very small or very large rectangles
            if w < 10 or h < 10 or w > cv_img.shape[1]/3 or h > cv_img.shape[0]/3:
                continue
                
            # Check if it's approximately square (potential checkbox or dice)
            if 0.8 <= w/h <= 1.2:
                obj_type = "checkbox"
                
                # Additional analysis to determine if it's a dice
                roi = gray[y:y+h, x:x+w]
                if roi.size > 0:
                    # Count potential dots (this is a simplistic approach)
                    _, dots = cv2.threshold(roi, 200, 255, cv2.THRESH_BINARY)
                    dot_contours, _ = cv2.findContours(dots, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
                    if 1 <= len(dot_contours) <= 6:
                        obj_type = "dice"
                
                detected_objects.append({
                    "type": obj_type,
                    "bbox": [x, y, x+w, y+h]
                })
                
                # Extract the object as an image
                obj_img = cv_img[y:y+h, x:x+w]
                if obj_img.size > 0:
                    obj_filename = f"{obj_type}_{i+1}.png"
                    cv2.imwrite(str(images_dir / obj_filename), obj_img)
    
    return detected_objects 