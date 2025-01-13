const InfoBox = ({ heading, backgroundColor, buttonInfo, children }) => {
    return (
      <div className={`p-6 rounded-lg shadow-md ${backgroundColor}`}>
        <h3 className="text-xl font-semibold mb-4">{heading}</h3>
        <p className="mb-4">{children}</p>
        <a
          href={buttonInfo.link}
          target={buttonInfo.target || "_self"}
          rel="noopener noreferrer"
          className={`inline-block px-4 py-2 text-white ${buttonInfo.backgroundColor} rounded-lg shadow-md hover:opacity-90 transition`}
        >
          {buttonInfo.text}
        </a>
      </div>
    );
  };
  
  export default InfoBox;