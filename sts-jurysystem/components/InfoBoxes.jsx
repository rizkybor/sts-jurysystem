import InfoBox from './InfoBox';

const InfoBoxes = () => {
  return (
    <section>
      <div className='container-xl lg:container m-auto'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg'>
          <InfoBox
            heading='All Events by Sustainable'
            backgroundColor='bg-gray-100'
            buttonInfo={{
              text: 'History Result All Events',
              link: '/properties',
              backgroundColor: 'bg-black',
            }}
          >
            Find all match results from sustainable timings.
          </InfoBox>
          <InfoBox
            heading='Jury Register'
            backgroundColor='bg-blue-100'
            buttonInfo={{
              text: 'Request as Jury',
              link: '/properties/add',
              backgroundColor: 'bg-blue-500',
            }}
          >
            Register as a jury in an activity.
          </InfoBox>
        </div>
      </div>
    </section>
  );
};
export default InfoBoxes;