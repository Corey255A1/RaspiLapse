# WunderVision 2024
# A Playground for Testing Image Processing and Object Detection
from time import sleep
import cv2
from datetime import datetime

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
    camera = cv2.VideoCapture(0)
    for i in range(0,30):
        res, frame = camera.read()
    camera.release()
    return frame

def grab_photo():
    frame = get_raw_image()
    time_stamp(frame)
    return jpeg_encode(frame)

def compare_frame(frame1, frame2):
    return cv2.absdiff(cv2.equalizeHist((frame2)), cv2.equalizeHist((frame1)))

def convert_to_gray(frame):
    return cv2.cvtColor(frame, cv2.COLOR_RGB2GRAY)

def blur(frame):
    return cv2.blur(frame, (5,5))

def check_for_differences(frame1, frame2):
    diff_image = compare_frame(frame1, frame2)
    _, threshold = cv2.threshold(diff_image, 30, 255, cv2.THRESH_BINARY)
    #threshold = cv2.adaptiveThreshold(diff_image,255,cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY,11,2)
    contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    return (len(contours), diff_image, threshold)


background_subtractor = cv2.createBackgroundSubtractorMOG2()
# background_subtractor = cv2.createBackgroundSubtractorKNN()
current_fg = None
camera = cv2.VideoCapture(0)
for i in range(0,120):
    res, frame = camera.read()
    current_fg = background_subtractor.apply(frame)
    print(i)
camera.release()
cv2.imshow("fg01", frame)
cv2.imshow("fg", current_fg)
cv2.waitKey(0)

frame = get_raw_image()
current_fg = background_subtractor.apply(frame, 0)
cv2.imshow("fg1", frame)
cv2.imshow("fg2", current_fg)
cv2.waitKey(0)

_, threshold = cv2.threshold(current_fg, 30, 255, cv2.THRESH_BINARY)
contours, _ = cv2.findContours(threshold, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
cv2.imshow("thres", threshold)
print(contours)
cv2.waitKey(0)
# frame1 = get_raw_image()
# cv2.imshow("initial",cv2.equalizeHist(blur(convert_to_gray(frame1))))
# cv2.waitKey(0)
# 
# frame2 = get_raw_image()
# cv2.imshow("2", cv2.equalizeHist(blur(convert_to_gray(frame2))))
# 
# (contours, diff, thresh) = check_for_differences(blur(convert_to_gray(frame1)), blur(convert_to_gray(frame2)))
# cv2.imshow("diff", diff)
# cv2.imshow("thres", thresh)
# cv2.waitKey(0)

cv2.destroyAllWindows();