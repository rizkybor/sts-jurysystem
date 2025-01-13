import InfoBox from './InfoBox';
import InfoBoxWa from './InfoBoxWa';


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
              link: '/matches',
              backgroundColor: 'bg-black',
            }}
          >
            Find all match results from sustainable timings.
          </InfoBox>
          <InfoBoxWa
            heading='Jury Register'
            backgroundColor='bg-blue-100'
            buttonInfo={{
              text: 'Request as Jury',
              link: 'https://wa.me/6285121110794?text=Jadikan%20saya%20sebagai%20juri%20bor,%20Mau%20test%20halaman%20judges',
              backgroundColor: 'bg-blue-500',
              target: '_blank',
            }}
          >
            Register as a jury in an activity.
          </InfoBoxWa>
        </div>
      </div>
    </section>
  );
};
export default InfoBoxes;