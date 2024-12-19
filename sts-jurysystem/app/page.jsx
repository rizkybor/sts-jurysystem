import Hero from '@/components/Hero';
import InfoBoxes from '@/components/InfoBoxes';
import HomeProperties from '@/components/HomeProperties';
import HomeMatches from '@/components/HomeMatches';
import FeaturedProperties from '@/components/FeaturedProperties';

const HomePage = () => {
  return (
    <>
      <Hero />
      <InfoBoxes />
      {/* <FeaturedProperties />
      <HomeProperties /> */}
      <HomeMatches />
    </>
  );
};
export default HomePage;