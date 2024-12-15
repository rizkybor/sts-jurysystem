import InfoBox from "./InfoBox";
const InfoBoxes = () => {
  return (
    <section>
      <div className="container-xl lg:container m-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg">
          <InfoBox
            heading="All Events"
            buttonInfo={{
              text: "Browse Events",
              link: "/properties",
              backgroundColor: "bg-black",
            }}
          >
            Find your result all events with Sustainable Timing System.
          </InfoBox>

          <InfoBox
            heading="Jury System"
            backgroundColor="bg-blue-100"
            buttonInfo={{
              text: "Let's Check",
              link: "/properties/add",
              backgroundColor: "bg-blue-500",
            }}
          >
            {" "}
            All penalties events by id jury checking.
          </InfoBox>
        </div>
      </div>
    </section>
  );
};

export default InfoBoxes;
