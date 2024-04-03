import { useEffect, useState } from 'react';
import './App.css';
import ImageList from './components/ImageList'
import MainImage from './components/MainImage'
const backend = "http://localhost:8989";


/**
 * @typedef {Object} ImageObject
 * @property {string} url
 * @property {string} time
 */

function App() {
  const [imageList, setImageList] = useState([]);
  const [current_image, setCurrentImage] = useState(null);
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

  async function deleteImage(image_object_id) {
    const route = `${backend}/delete`;
    const body = JSON.stringify({ id: image_object_id });
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

    const index = imageList.findIndex(image_object=>image_object.time === image_object_id);
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

  return (
    <div className="App">
      <header className="App-header">
        <h1>
          WunderVision - RaspiLapse
        </h1>
      </header>
      <MainImage
        imageObject={current_image}
        onDelete={deleteImage} 
        onCapture={captureImage}/>
      <ImageList
        imageObjects={imageList}
        onImageSelected={(image_object) => setCurrentImage(image_object)} />
    </div>
  );
}

export default App;
