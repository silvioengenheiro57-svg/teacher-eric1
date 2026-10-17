import { BookOpen, BriefcaseBusiness, HeartHandshake, Mic2, PenLine, Users } from 'lucide-react';
import { Shell } from '@/components/nav';

const highlights = [
  {
    icon: Mic2,
    title: 'Educação e presença pública',
    body: 'Professor de inglês angolano, conhecido por defender métodos de ensino mais práticos e dinâmicos. A participação em programas de grande audiência, incluindo o Fly Podcast, ampliou o debate sobre o ensino de línguas em Angola.',
  },
  {
    icon: BriefcaseBusiness,
    title: 'Ensino e carreira',
    body: 'Lidera uma equipa com mais de 40 professores, que ministra aulas online e ao domicílio. O trabalho já alcançou mais de 5.000 estudantes em Angola, Moçambique, Portugal, Brasil, Guiné e outros países.',
  },
  {
    icon: HeartHandshake,
    title: 'Filantropia e acesso à educação',
    body: 'Criou uma comunidade online com aulas de inglês 100% gratuitas para mais de 100 mil pessoas e já concedeu mais de 500 bolsas de estudo a pessoas com menos possibilidades financeiras.',
  },
  {
    icon: PenLine,
    title: 'Outras áreas de atuação',
    body: 'Além de professor e mentor, também é escritor, compositor, influencer, produtor e palestrante.',
  },
];

export default function AboutTeacherEricPage() {
  return (
    <Shell title="Tudo sobre Teacher Eric" subtitle="Conhece o seu trabalho, a sua missão e o impacto da comunidade.">
      <div className="teacher-eric-about">
        <section className="panel teacher-eric-about-intro">
          <p className="eyebrow">PROFESSOR DE INGLÊS · ANGOLA</p>
          <h2>Aqui você não aprende apenas INGLÊS, você aprende a VIDA!</h2>
          <p>Teacher Eric promove uma aprendizagem de inglês prática e dinâmica, incentivando os alunos a desenvolverem confiança e a crescerem através da educação.</p>
        </section>
        <div className="teacher-eric-about-grid">
          {highlights.map(({ icon: Icon, title, body }) => (
            <article className="panel teacher-eric-about-card" key={title}>
              <span><Icon size={21} /></span>
              <div><h3>{title}</h3><p>{body}</p></div>
            </article>
          ))}
          <article className="panel teacher-eric-about-card">
            <span><BookOpen size={21} /></span>
            <div><h3>Uma comunidade para aprender</h3><p>Um espaço para praticar, partilhar conhecimento e apoiar o percurso de aprendizagem de cada membro.</p></div>
          </article>
          <article className="panel teacher-eric-about-card">
            <span><Users size={21} /></span>
            <div><h3>Uma missão que atravessa fronteiras</h3><p>Aulas e iniciativas que chegam a estudantes de vários países e criam novas oportunidades através do inglês.</p></div>
          </article>
        </div>
      </div>
    </Shell>
  );
}
