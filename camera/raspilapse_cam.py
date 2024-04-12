# WunderVision 2024
# A flask web server to grab a photo
# and return it from a web request
from flask import Flask, request, Response, jsonify
import urllib.request
from time import sleep
import cv2
from picamera import PiCamera
from picamera.array import PiRGBArray
from datetime import datetime
import numpy as np
RASPI_SVR = "http://192.168.1.125:8989"


def register():
   url = RASPI_SVR + "/register"
   print(url)
   try:
     response = urllib.request.urlopen(url)
     print(response)
     if response.getcode() == 200:
       return 0
     else:
       return -2
   except urllib.error.URLError as e:
     return -1

def time_stamp(image):
   text = str(datetime.now())
   font = cv2.FONT_HERSHEY_SIMPLEX
   font_scale = 1
   font_color = (125, 125, 10)  # bluegreen color
   thickness = 4
   cv2.putText(image, text, (2000, 1800), font, font_scale, font_color, thickness)


def jpeg_encode(frame):
    return cv2.imencode(".jpg", frame)[1]

def get_raw_image():
    camera = PiCamera()
    rgbCapture = PiRGBArray(camera)
    sleep(0.5)
    camera.capture(rgbCapture, format="bgr")
    camera.close()
    return rgbCapture.array

def get_raw_image_sequence(count):
    if count <= 0: return None
    camera = PiCamera()
    rgbCapture = PiRGBArray(camera)
    sleep(0.5)
    for frame in camera.capture_continuous(rgbCapture, format="bgr"):
       yield frame.array
       print(count)
       rgbCapture.truncate(0)
       count = count - 1
       if count <= 0: break
    camera.close()

def grab_photo():
    frame = get_raw_image()
    time_stamp(frame)
    return jpeg_encode(frame)

app = Flask(__name__)
background_subtractor = cv2.createBackgroundSubtractorMOG2()
detection_region_tl = (400, 200)
detection_region_br = (1200, 1000)


@app.route("/get_photo")
def get_photo():
    return Response(grab_photo().tostring(), content_type='image/jpeg')

def get_diff_image():
   global background_subtractor
   global detection_region_tl
   global detection_region_br
   kernel = np.ones((5, 5), np.uint8) 
   foreground = background_subtractor.apply(get_raw_image(), learningRate=0)
   foreground = cv2.erode(foreground, kernel)
   return foreground

def apply_region(frame):
    return cv2.rectangle(frame, detection_region_tl, detection_region_br, (127,127,127), 10)

@app.route("/get_diff_image")
def handle_get_diff_image():
   return Response(jpeg_encode(apply_region(get_diff_image())).tostring(), content_type='image/jpeg')

def set_base_image(initial_count):
    # Create a new background subtractor
    global background_subtractor
    background_subtractor = cv2.createBackgroundSubtractorMOG2()
    for frame in get_raw_image_sequence(initial_count):
       background_subtractor.apply(frame)
    return background_subtractor

@app.route("/set_base_image")
def handle_set_base_image():
    subtractor = set_base_image(4)
    return Response(jpeg_encode(subtractor.getBackgroundImage()).tostring(), content_type='image/jpeg')

def update_base_image(count):
    global background_subtractor
    for frame in get_raw_image_sequence(count):
       background_subtractor.apply(frame)
    return background_subtractor

@app.route("/update_base_image")
def handle_update_base_image():
    subtractor = update_base_image(4)
    return Response(jpeg_encode(subtractor.getBackgroundImage()).tostring(), content_type='image/jpeg')

def set_detection_region(x1, y1, x2, y2):
    global detection_region_tl
    global detection_region_br
    detection_region_tl = (x1, y1)
    detection_region_br = (x2, y2)
    return {"x1":x1, "y1":y1, "x2":x2, "y2":y2}

@app.route("/set_detection_region")
def handle_set_detection_region():
    region = set_detection_region(int(request.args.get('x1')),
                          int(request.args.get('y1')), 
                          int(request.args.get('x2')), 
                          int(request.args.get('y2')))
    return jsonify(region);

def get_contour_count():
   foreground = get_diff_image()
   region_of_interest = foreground[detection_region_tl[1]:detection_region_br[1], detection_region_tl[0]:detection_region_br[0]]
   _ , threshold = cv2.threshold(region_of_interest, 30, 255, cv2.THRESH_BINARY)
   contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
   return len(contours)

@app.route("/is_object_detected")
def handle_is_object_detected():
    return jsonify({"detected":get_contour_count()})


@app.route("/status")
def get_status():
   return jsonify({"status":"good"});



if __name__ == "__main__":
    print("Initializing Camera")
    for frame in get_raw_image_sequence(4):
       background_subtractor.apply(frame)
    print("Starting Server")
    app.run(host='0.0.0.0', port=7070, debug=False)

