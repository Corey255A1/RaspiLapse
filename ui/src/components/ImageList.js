import React from 'react';

/**
 * 
 * @param {Array<ImageObject>} imageUrls 
 * @returns 
 */
const ImageList = ({ imageObjects, onImageSelected }) => {
    return (
    <div className="image-list">
      {imageObjects.map((imageObject) => (
        <div onClick={()=>{onImageSelected(imageObject)}} className="small-image">
            <img key={imageObject.time} src={imageObject.url} alt={`${imageObject.time}`} />
            <div>{imageObject.time}</div>
        </div>
      ))}
    </div>
  );
};

export default ImageList;