import React from 'react';

/**
 * 
 * @param {Array<ImageObject>} imageUrls 
 * @returns 
 */
const ImageList = ({ imageObjects }) => {
  return (
    <div className="image-list">
      {imageObjects.map((imageObject, index) => (
        <div>
            <img key={index} src={imageObject.url} alt={`${index}`} />
            <div>{imageObject.time}</div>
        </div>
      ))}
    </div>
  );
};

export default ImageList;