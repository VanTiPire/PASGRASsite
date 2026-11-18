/* ===========================================================
   PAGE CONTENT
===========================================================

   `bookPages` lists every inner page IN ORDER, starting at page 2
   (page 1 is the front cover). Page number = position + 2.
   To add / move / remove a page, just edit this list: nothing else
   (CSS, index links) depends on hard-coded page numbers.

   Fields of each page:
     id          unique name, used by the index links ("to")
     title       h2 (or null)
     titleSize   'big' for the large centred title; otherwise small and underlined
     titleOneLine  true -> the title never wraps by itself (use \n in the title for a line break):
                 its font shrinks just enough for the longest line to fit
     titleTight  true -> smaller space between the lines of a two-line title
     image1      image shown before the text   (+ imageClass1)
     text        array of paragraphs. Each item is a string or { t, cls, head, foot, link }
                 link: { text, href } -> link shown after `t`
                 head: bold first line of the paragraph, foot: small last line
                 cls: 'box'        yellow box
                      'box star'   highlighted yellow box
                      'stat'       big highlighted figure
                      'source'     small citation line
     links       [{ label, to: '<page id>' }, { heading: 'texto' }]  -> clickable index entries (sub: true -> indented sub-chapter),
                 or a non-clickable subtitle between them
     image2      image shown after the text    (+ imageClass2)
     (image widths are set per page in flip.css: ".sj-book .pN .book-content img")
     (font sizes are those of the original stylesheet: 22px text, 26px titles.
                 Pages have a fixed size and hide overflow: if a page's text doesn't
                 fit, pages.js lists it in the browser console - split or shorten it.)
     cls         extra class(es) for the page content

   The book must have an EVEN number of pages in total
   (cover + inner pages + back cover) and index.html must contain
   one <div> per page (see the note in index.html).

=========================================================== */

/* URL do link "Para saberes mais, acede a este link" (página Enquadramento).
   Enquanto estiver vazio, o texto aparece sublinhado mas sem ligação. */
var PASGRAS_URL = '';

function box(t) { return { t: t, cls: 'box' }; }

var bookPages = [

	/* ===================== ÍNDICE (páginas 2 e 3) ===================== */

	{
		id: 'indice',
		title: 'Índice',
		titleSize: 'big',
		text: [],
		cls: 'index-page',
		links: [
			{ label: 'Nota Informativa', to: 'nota' },
			{ label: 'O que dizem os números?', to: 'importante' },
			{ heading: 'PAS GRAS' },
			{ label: 'O que é o PAS GRAS?', to: 'pasgras' },
			{ label: 'Muitos fatores, muitas combinações', to: 'fatores' },
			{ label: 'Público Alvo e Objetivos', to: 'objetivos-pasgras' }
		]
	},

	{
		id: 'indice2',
		title: null,
		text: [],
		cls: 'index-page',
		links: [
			{ heading: 'Plataforma interativa' },
			{ label: 'Enquadramento', to: 'enquadramento' },
			{ label: 'O que se pretende?', to: 'pretende' },
			{ label: 'Como alcançar?', to: 'alcancar' },
			{ sub: true, label: 'INFORMAR', to: 'informar' },
			{ sub: true, label: 'CONSOLIDAR CONHECIMENTOS', to: 'consolidar' },
			{ sub: true, label: 'PROMOVER A PREVENÇÃO', to: 'prevencao' }
		]
	},


	/* ===================== NOTA INFORMATIVA (páginas 4 e 5) ===================== */

	{
		id: 'nota',
		title: 'Nota informativa sobre a plataforma',
		text: [
			'Esta plataforma interativa foi criada no âmbito do projeto europeu PAS GRAS, e destina-se a adolescentes dos 12 aos 15 anos e às suas famílias. Vais aprender mais sobre:',
			box('METABOLISMO'),
			box('ALIMENTAÇÃO'),
			box('ATIVIDADE FÍSICA'),
			box('SONO e BEM-ESTAR físico e mental')
		]
	},

	{
		id: 'informativo',
		title: null,
		image1: 'pics/page5.png',
		imageClass1: 'right-pic',
		cls: 'fs-20',
		text: ['O website é puramente INFORMATIVO e PREVENTIVO, sem qualquer função clínica, diagnóstica ou terapêutica.']
	},


	/* ===================== O QUE DIZEM OS NÚMEROS (páginas 6 e 7) ===================== */

	{
		id: 'importante',
		title: 'O que dizem os números?',
		text: [
			'Entre 1975 e 2022, a obesidade mais do que triplicou em todo o mundo. Atualmente, mais de MIL MILHÕES de pessoas vivem com obesidade, sendo um dos maiores desafios de saúde pública da atualidade. Em 2050, estima-se que:',
			
			box('4 MIL MILHÕES de pessoas vivam com excesso de peso ou obesidade'),
			box('1 EM CADA 3 crianças e adolescentes e quase 2 EM CADA 3 adultos com mais de 25 anos sejam afetados por esta condição')
			
		]
	},

	{
		id: '2050',
		title: null,
		text: [
			'Estes números não representam um futuro inevitável. São estimativas que podem mudar com medidas eficazes de prevenção e promoção da saúde. É por isso que projetos como o PAS GRAS e esta plataforma interativa são tão importantes!'
		],
		image2: 'pics/page9.png',
		imageClass2: 'right-pic'
	},


	/* ===================== O QUE É O PAS GRAS (páginas 8 e 9) ===================== */

	{
		id: 'pasgras',
		title: 'O que é o PAS GRAS?',
		titleSize: 'big',
		text: [
			'O PAS GRAS é um projeto europeu de investigação que procura PREVENIR e COMBATER a obesidade.',
			'Nas últimas décadas, o excesso de peso e a obesidade têm aumentado em todo o mundo. Assim, para enfrentar este desafio, o projeto estuda três fatores que influenciam a nossa saúde:',
			box('METABÓLICOS'),
			box('AMBIENTAIS'),
			box('COMPORTAMENTAIS')
		]
	},

	{
		id: 'nome',
		title: null,
		image1: 'pics/page7.png',
		imageClass1: 'right-pic',
		cls: 'fs-20',
		text: [
			'PAS GRAS é uma expressão francesa que significa SEM GORDURA. O nome reflete a missão do projeto, que procura promover hábitos saudáveis e criar ambientes que favoreçam o bem-estar de todos.'
		]
	},


	/* ===================== MUITOS FATORES, MUITAS COMBINAÇÕES (páginas 10 e 11) ===================== */

	{
		id: 'fatores',
		title: 'Muitos fatores,\nmuitas combinações',
		titleSize: 'big',
		titleOneLine: true,
		titleTight: true,
		text: [
			'A obesidade é uma condição complexa que resulta da interação de vários fatores. Importa analisares como estes se relacionam e influenciam a saúde de cada pessoa:',
				box('O METABOLISMO e a forma como o organismo utiliza e regula a energia'),
			box('A PREDISPOSIÇÃO GENÉTICA e as características herdadas dos nossos pais')
		]
	},

	{
		id: 'fatores2',
		title: null,
		text: [
			box('A ALIMENTAÇÃO, a ATIVIDADE FÍSICA e o papel do sedentarismo na saúde'),
			box('O BEM-ESTAR PSICOLÓGICO e a relação entre o stress, os sentimentos e os nossos comportamentos'),
			box('O CONTEXTO ECONÓMICO e as ROTINAS FAMILIARES que determinam as escolhas do dia a dia '),
			box('O AMIENTE ENVOLVENTE e as condições ambientais e físicas dos espaços onde vivemos'),
			'Posto isto, aquilo que influencia a saúde de uma pessoa pode não ter o mesmo efeito noutra.'
		]
	},


	/* ===================== PÚBLICO ALVO E OBJETIVOS (páginas 12 e 13) ===================== */

	{
		id: 'objetivos-pasgras',
		title: 'Público Alvo e Objetivos',
		titleSize: 'big',
		titleOneLine: true,
		text: [
		'A saúde acompanha-nos ao longo de toda a vida, sendo que cada fase traz mudanças, desafios e necessidades diferentes. Por isso, o PAS GRAS dedica-se a quatro faixas etárias:',
			 box('CRIANÇAS (3–9 ANOS)'), 
			 box('ADOLESCENTES (10–18 ANOS)'), 
			 box('JOVENS ADULTOS (19–25 ANOS)'),
				box('ADULTOS (25–55 ANOS)')	
		]
	},

	{
		id: 'objetivos-pasgras2',
		title: null,
		cls: 'tight-top',
		text: [
				'Assim sendo, o que pretende o PAS GRAS?',
			box('DETERMINAR que fatores influenciam a saúde'),
			box('CRIAR uma Ferramenta de Avaliação de Risco, que estime a probabilidade de desenvolvimento da obesidade ou de complicações associadas'),
			box('DESENVOLVER programas personalizados, com recomendações sobre alimentação, atividade física e outros hábitos de vida'),
			box('LANÇAR a CAMPANHA PAS GRAS, para aproximar a ciência e o público, e educar sobre a saúde e a obesidade')
		]
	},


	/* ===================== ENQUADRAMENTO (páginas 14 e 15; a página direita fica em branco: o livro precisa de páginas aos pares) ===================== */

	{
		id: 'enquadramento',
		title: 'Enquadramento',
		text: [
			'Dentro das SEIS ATIVIDADES (A) em que o PAS GRAS está organizado, esta plataforma interativa enquadra-se na ATIVIDADE 4:',
			box('COPRODUÇÃO de ferramentas e intervenções criativas e interativas que ligam literacia em saúde-dieta-atividade física ao longo da vida'),
			{ t: 'Para saberes mais, acede a ', link: { text: 'este link', href: PASGRAS_URL } }
		]
	},

	{
		id: 'branco',
		title: null,
		text: []
	},


	/* ===================== A PLATAFORMA ===================== */

	{
		id: 'pretende',
		title: 'O que se pretende?',
		titleSize: 'big',
		image1: 'pics/page18.png',
		imageClass1: 'left-pic',
		text: [
			'O objetivo principal da plataforma é PROMOVER a literacia em saúde, através de conteúdos acessíveis e interativos que facilitam a compreensão dos fatores que influenciam a saúde e o bem-estar. Procura-se, com este website:'
		]
	},

	{
		id: 'objetivos',
		title: null,
		cls: 'tight-top',
		text: [
			box('INFORMAR sobre os principais fatores que influenciam a saúde e o bem-estar'),
			box('INCENTIVAR A REFLEXÃO sobre os hábitos e comportamentos do dia a dia'),
			box('CONSOLIDAR CONHECIMENTOS, através de atividades, desafios e jogos interativos'),
			box('PROMOVER COMPORTAMENTOS PREVENTIVOS e escolhas mais saudáveis'),
			box('VALORIZAR UMA VISÃO HOLÍSTICA DA SAÚDE, considerando o bem-estar físico e mental'),
			box('ENVOLVER AS FAMÍLIAS, incentivando a participação e a aprendizagem em conjunto')
		]
	},

	{
		id: 'alcancar',
		title: 'Como alcançar?',
		titleSize: 'big',
		text: [
			'Aprender sobre saúde não se resume a ler. Aqui vais EXPLORAR conteúdos, PARTICIPAR em atividades interativas e COMPREENDER o impacto das tuas escolhas, através de uma experiência simples, visual e divertida.',
			'Para concretizar esta abordagem, a plataforma está organizada em QUATRO MÓDULOS principais. Cada módulo aborda um tema relevante para a saúde e o bem-estar e é acompanhado por uma personagem que te guia ao longo de três fases:'
		]
	},

	{
		id: 'informar',
		title: 'INFORMAR',
		text: [
			'Vais EXPLORAR o tema através de uma narrativa visual protagonizada pela personagem, que apresenta a informação científica de forma simples, acessível e próxima do quotidiano.'
		],
		image2: 'pics/page21.png',
		imageClass2: 'right-pic'
	},

	{
		id: 'consolidar',
		title: 'CONSOLIDAR CONHECIMENTOS',
		text: [
			'Vais PARTICIPAR com a personagem em mini-jogos inspirados nas BDs do projeto PAS GRAS, onde reforças e testas os conhecimentos adquiridos.'
		],
		image2: 'pics/page22.png',
		imageClass2: 'left-pic'
	},

	/* Última página interior (hard, lado direito) */
	{
		id: 'prevencao',
		title: 'PROMOVER A PREVENÇÃO',
		text: [
			'Vais COMPREENDER como as tuas escolhas podem influenciar a saúde e o bem-estar, através de desafios e atividades práticas para realizares no dia a dia em conjunto com a tua família.'
		],
		image2: 'pics/page23.png',
		imageClass2: 'right-pic'
	}

];


/* page number -> content, and page id -> page number */
var pageContent = {};
var pageIds = {};

bookPages.forEach(function (page, i) {
	pageContent[i + 2] = page;
	pageIds[page.id] = i + 2;
});

/* Total pages of the book = cover + inner pages + back cover */
var TOTAL_PAGES = bookPages.length + 2;