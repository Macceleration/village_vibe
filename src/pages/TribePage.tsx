import { useSeoMeta } from '@unhead/react';
import { useParams } from 'react-router-dom';
import { TribeView } from '@/components/tribes/TribeView';
import NotFound from './NotFound';

const TribePage = () => {
  const { tribeId } = useParams<{ tribeId: string }>();

  useSeoMeta({
    title: 'Tribe - Village Vibe',
    description: 'View tribe details, members, events, and stories.',
  });

  if (!tribeId) {
    return <NotFound />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <TribeView tribeId={tribeId} />
    </div>
  );
};

export default TribePage;