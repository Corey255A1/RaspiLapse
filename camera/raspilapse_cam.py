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
   font_color = (125, 125, 10)  # bluegren color
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

def grab_photo():
    frame = get_raw_image()
    time_stamp(frame)
    return jpeg_encode(frame)

def compare_frame(frame1, frame2):
    return cv2.absdiff(frame1, frame2)

def convert_to_gray(frame):
    return cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)

def check_for_differences(frame1, frame2):
    diff_image = compare_frame(frame1, frame2)
    _, threshold = cv2.threshold(diff_image, 30, 255, cv2.THRESH_BINARY)
    contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return len(contours)

app = Flask(__name__)
@app.route("/get_photo")
def get_photo():
    return Response(grab_photo().tostring(), content_type='image/jpeg')

@app.route("/get_diff_image")
def get_diff_image():
   global base_image
   diff_image = convert_to_gray(get_raw_image())
   diff_image = compare_frame(base_image, diff_image)
   return Response(jpeg_encode(diff_image).tostring(), content_type='image/jpeg')

base_image = None
@app.route("/set_base_image")
def set_base_image():
    global base_image
    new_image = get_raw_image()
    new_image = convert_to_gray(new_image)
    base_image = new_image
    return Response(jpeg_encode(base_image).tostring(), content_type='image/jpeg')

@app.route("/is_object_detected")
def is_object_detected():
    image = convert_to_gray(get_raw_image())
    return jsonify({"detected":check_for_differences(base_image, image)})


@app.route("/status")
def get_status():
   return jsonify({"status":"good"});





if __name__ == "__main__":
    if register() != 0:
      print("Could not connect to server")
      #exit(1)
    base_image = convert_to_gray(get_raw_image())
    app.run(host='0.0.0.0', port=7070, debug=True)

