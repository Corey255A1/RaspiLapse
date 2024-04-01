import { useEffect, useState } from 'react';
import './App.css';
import ImageList from './components/ImageList'
import MainImage from './components/MainImage'
const backend = "http://localhost:8080";


/**
 * @typedef {Object} ImageObject
 * @property {string} url
 * @property {string} time
 */

function App() {
  const [image_list, setImageList] = useState([]);
  const [current_image, setCurrentImage] = useState(null);
  useEffect(() => {
    async function update_image_list() {
      const initial = await get_recent_images();
      setImageList(initial);
      if (initial.length > 0) {
        setCurrentImage(initial[0]);
      }
    };
    update_image_list();
  }, []);


  /**
   * @returns {ImageObject}
   */
  async function get_recent_images() {
    const route = `${backend}/recent`;
    console.log(route);
    const response = await fetch(route);

    const object = await response.json();
    console.log(object);
    return object;
  }

  async function delete_image(image_object_id) {
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
    if (response && response.ok) {
      const index = image_list.findIndex(image_object=>image_object.time == image_object_id);
      image_list.splice(index, 1);
      console.log(image_list);
      setImageList(image_list);
      setCurrentImage(image_list[index]);
    }
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
        onDelete={delete_image} />
      <ImageList
        imageObjects={image_list}
        onImageSelected={(image_object) => setCurrentImage(image_object)} />
    </div>
  );
}

export default App;
