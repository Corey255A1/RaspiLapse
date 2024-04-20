import { useEffect, useState } from 'react';
import './App.css';
import ImageList from './components/ImageList'
import MainImage from './components/MainImage'
const backend = `http://${window.location.hostname}:8181`;
//const backend = `http://${window.location.hostname}:8996`;
//const backend = `http://192.168.1.125:8181`;


/**
 * @typedef {Object} ImageObject
 * @property {string} url
 * @property {string} time
 */

function App() {
  const [imageList, setImageList] = useState([]);
  const [currentImage, setCurrentImage] = useState(null);

  useEffect(() => {
    async function updateImageList() {
      const initial = await getRecentImages();
      setImageList(initial);
      if (initial.length > 0) {
        setCurrentImage(initial[0]);
      }
    };
    updateImageList();
  }, []);


  /**
   * @returns {ImageObject}
   */
  async function getRecentImages() {
    const route = `${backend}/recent`;
    console.log(route);
    const response = await fetch(route);

    const object = await response.json();
    console.log(object);
    return object;
  }

  async function deleteImage(imageObjectID) {
    const route = `${backend}/delete`;
    const body = JSON.stringify({ id: imageObjectID });
    const response = await fetch(route, {
      method: 'POST',
      body: body,
      headers: {
        'Content-type': 'application/json; charset=UTF-8',
      }
    }).catch(reason => {
      console.log(reason);
    });
    console.log(response);
    if (!(response && response.ok)) { return; }

    const index = imageList.findIndex(imageObject => imageObject.time === imageObjectID);
    imageList.splice(index, 1);
    console.log(imageList);
    setImageList(imageList.slice());
    setCurrentImage(imageList[index]);
  }

  async function captureImage() {
    const route = `${backend}/capture`;
    const response = await fetch(route);
    if (!(response && response.ok)) { return; }
    const imageObject = await response.json();
    imageList.unshift(imageObject);
    console.log(imageList);
    setImageList(imageList.slice());
  }

  async function fetchPreviousImage(imageObjectID) {
    const route = `${backend}/previous?id=${imageObjectID}`;
    const response = await fetch(route);
    if (!(response && response.ok)) { return null; }

    return await response.json();
  }

  async function previousImage() {
    const currentIndex = imageList.findIndex((imageObject) => { return imageObject.time == currentImage.time });
    let nextImageObject = null;
    if (currentIndex + 1 >= imageList.length) {
      nextImageObject = await fetchPreviousImage(currentImage.time);
      if (nextImageObject == null) {
        return;
      }
      imageList.push(nextImageObject);
    }
    else{
      nextImageObject = imageList[currentIndex + 1];
    }

    setCurrentImage(nextImageObject);
  }

  async function nextImage() {
    const currentIndex = imageList.findIndex((imageObject) => { return imageObject.time == currentImage.time });
    let nextImageObject = null;
    if (currentIndex - 1 < 0) { return; }

    nextImageObject = imageList[currentIndex - 1];
    setCurrentImage(nextImageObject);
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          WunderVision - RaspiLapse
        </h1>
      </header>
      <MainImage
        imageObject={currentImage}
        onDelete={deleteImage}
        onCapture={captureImage} 
        onNextImage={nextImage}
        onPreviousImage={previousImage}/>
      <ImageList
        imageObjects={imageList}
        onImageSelected={(imageObject) => setCurrentImage(imageObject)} />
    </div>
  );
}

export default App;
