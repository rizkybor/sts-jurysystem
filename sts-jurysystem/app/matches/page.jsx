import MatchSearchForm from '@/components/MatchSearchForm';
import Matches from '@/components/Matches';

const MatchesPage = async () => {
  return (
    <>
      <section className='surface-sts py-4'>
        <div className='max-w-7xl mx-auto px-4 flex flex-col items-start sm:px-6 lg:px-8'>
          <MatchSearchForm />
        </div>
      </section>
      <Matches />
    </>
  );
};
export default MatchesPage;