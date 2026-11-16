/*
 * Plantão Quest — dados dos casos.
 *
 * Cada caso segue o mesmo fluxo de quatro etapas:
 *   0 Acolhimento → 1 Anamnese (pistas) → 2 Exame (pistas + classificação) → 3 Conduta → desfecho.
 *
 * Cada caso aponta para um tema de data/acervo.js pelo campo `theme`.
 * look/companion: aparência do paciente e do acompanhante (veja js/sprites.js). arrival: fala de chegada.
 * returnLine: fala quando o paciente volta (memória). reactions: reação narrativa a cada decisão, certa ou errada.
 * {doc} vira o nome do seu personagem, por exemplo "Dra. Ana".
 * Para criar um caso novo, copie um dos objetos abaixo, troque o `id` (único, sem espaços)
 * e preencha os textos. O motor (game.js) não precisa ser alterado.
 * - history.clues e exam.clues: [título da pergunta/ação, o que o aluno descobre]. Pode ter 1 a 4 pistas.
 * - classify e treatment: choices = [texto da alternativa, explicação]; correct = índice da certa (0 = A).
 * - patient.colors: 10 cores do sprite (cabelo escuro, cabelo, sombra do cabelo, pele escura, pele,
 *   pele clara, roupa, roupa clara, calça, detalhe).
 * Pontuação de todos os casos: 40 XP pelas pistas, 20 pela classificação certa de primeira
 * e 40 pela conduta certa de primeira (máximo de 100 XP).
 *
 * Simulação educacional: personagens fictícios. Confira sempre as fontes indicadas.
 */
window.PLANTAO_CASES = [
  {
    id: 'bia',
    theme: 'dda',
    number: '001',
    specialty: 'PEDIATRIA',
    minutes: 5,
    title: 'Diarreia e sede',
    heading: ['Diarreia e', 'sede'],
    summary: 'Diarreia desde ontem e muita sede. Lia, a mãe, quer saber se Bia precisa de soro na veia.',
    patient: {
      name: 'Bia',
      card: '8 anos · Acompanhada pela mãe, Lia',
      short: 'Bia · 8 anos',
      colors: ['#261b27', '#623a2b', '#412a24', '#995833', '#ce8758', '#efb47b', '#f1bf66', '#f7d990', '#4e5969', '#805c94'],
    },
    look: { skin: '#c98e63', hairStyle: 'trancas', hairColor: '#3b2a20', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#f1bf66', pants: '#4e5969', acc: [], child: true },
    companion: { name: 'Lia', role: 'mãe da Bia', look: { skin: '#c98e63', hairStyle: 'coque', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#805c94', pants: '#3a3f4a', acc: ['brinco'] } },
    arrival: 'Boa tarde… a Bia está com diarreia desde ontem e agora não para de pedir água.',
    returnLine: '{doc}! A Bia lembrou de você. Voltamos para treinar de novo.',
    reactions: {
      classify: { right: ['Lia', 'happy', 'Então ela está desidratada, mas dá para cuidar aqui mesmo? Que alívio.'], wrong: ['Lia', 'sad', 'Mas, {doc}, olha como ela continua pedindo água… será isso mesmo?'] },
      treatment: { right: ['Lia', 'happy', 'Ela já tomou meio copo do soro e voltou a sorrir!'], wrong: ['Lia', 'sad', 'Ela segue com a boca seca e chorando sem lágrimas… estou preocupada.'] },
    },
    intro: {
      title: 'Bia chegou à UBS',
      quote: '“Ela começou a passar mal ontem. Hoje ficou com muita sede.”',
      cite: '— Lia, mãe da Bia',
      hint: 'Aproxime-se da recepção para chamar Bia e abrir a consulta.',
    },
    actions: ['Chamar a paciente na recepção', 'Conversar com a acompanhante', 'Examinar a paciente', 'Registrar a conduta'],
    objectives: [
      'Chame a paciente para a consulta.',
      'Converse com Lia e descubra duas pistas.',
      'Examine Bia e classifique a hidratação.',
      'Escolha a conduta inicial para Bia.',
    ],
    history: {
      title: 'O que aconteceu?',
      prompt: 'O que você quer perguntar à mãe?',
      next: 'Examinar Bia',
      clues: [
        ['Perguntar sobre as evacuações', 'Lia conta que Bia teve seis evacuações líquidas desde ontem, sem sangue nas fezes.'],
        ['Perguntar sobre líquidos e urina', 'Bia está com muita sede, consegue beber e urinou menos que de costume.'],
      ],
    },
    exam: {
      title: 'Observe os sinais',
      hint: 'Faça as duas avaliações para classificar o estado de hidratação.',
      clues: [
        ['Observar o estado geral e a boca', 'Bia está alerta e irritada, com olhos fundos e boca seca.'],
        ['Avaliar a sede, a prega e o pulso', 'Ela bebe com vontade. A prega abdominal volta lentamente, e o pulso está cheio.'],
      ],
    },
    classify: {
      prompt: 'Como você classifica o estado de hidratação de Bia?',
      next: 'Escolher a conduta',
      correct: 1,
      choices: [
        ['Sem sinais de desidratação', 'Os olhos fundos, a sede e a prega lenta apontam para desidratação.'],
        ['Com desidratação, sem sinais de gravidade', 'O conjunto de sinais indica desidratação. Bia está alerta, consegue beber e tem pulso cheio.'],
        ['Com desidratação grave', 'A criança está alerta, bebe com vontade e tem pulso cheio. Reavalie os sinais antes de classificar como grave.'],
      ],
    },
    treatment: {
      summary: 'Diarreia aguda, olhos fundos, sede, prega lenta e pulso cheio. Bia está alerta e consegue beber.',
      prompt: 'Qual é a melhor conduta inicial para este caso?',
      next: 'Encerrar o atendimento',
      correct: 2,
      choices: [
        ['Orientar hidratação em casa e dar alta agora', 'Bia já apresenta desidratação. O Plano A passa a ser adequado depois da reidratação e da reavaliação na unidade.'],
        ['Iniciar antibiótico de rotina', 'Neste caso, o manejo inicial é a reidratação. A história e o exame não mostram indicação de antibiótico de rotina.'],
        ['Reidratar por via oral na UBS e reavaliar', 'O Plano B usa solução de sais de reidratação oral na UBS, com reavaliações até a resolução dos sinais.'],
        ['Iniciar hidratação intravenosa imediata', 'Bia consegue beber e não apresenta sinais de desidratação grave. A via oral com supervisão é a escolha inicial deste caso.'],
      ],
    },
    outcome: {
      title: 'Bia está melhor!',
      quote: '“Ela já está mais disposta. Agora entendi quando voltar à UBS.”',
      cite: '— Lia, após a reavaliação',
      text: 'Na simulação, Bia foi reavaliada após a reidratação oral e os sinais de desidratação desapareceram.',
      badge: 'Primeiro plantão',
    },
    sources: [
      { label: 'Ministério da Saúde · Doenças diarreicas agudas', url: 'https://www.gov.br/saude/pt-br/assuntos/saude-de-a-a-z/d/dda/' },
    ],
  },

  {
    id: 'raimundo',
    theme: 'dengue',
    number: '002',
    specialty: 'CLÍNICA MÉDICA',
    minutes: 6,
    title: 'Febre na época das chuvas',
    heading: ['Febre na época', 'das chuvas'],
    summary: 'Febre alta há três dias, dor no corpo e atrás dos olhos. Dois vizinhos tiveram dengue neste mês.',
    patient: {
      name: 'Seu Raimundo',
      card: '54 anos · Pescador, veio sozinho',
      short: 'Seu Raimundo · 54 anos',
      colors: ['#2a2622', '#9a978f', '#6a675f', '#7d4f33', '#b07a52', '#cf9c74', '#3f6f9c', '#6c9bc4', '#3a3f4a', '#c94f3d'],
    },
    look: { skin: '#b07a52', hairStyle: 'raspado', hairColor: '#d9d9d9', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#3f6f9c', pants: '#3a3f4a', acc: ['chapeu'] },
    arrival: 'Ô de casa… essa febre não me larga, {doc}. Dói tudo, até atrás dos olhos.',
    returnLine: 'Olha só, {doc}! O pescador aqui voltou. Desta vez vim logo, viu?',
    reactions: {
      classify: { right: ['Seu Raimundo', 'neutral', 'Grupo B, é? Tá certo. Eu espero o exame aqui sentado.'], wrong: ['Seu Raimundo', 'sad', 'Hum… mas eu tenho diabetes e apareceram essas pintinhas no braço. Isso não muda nada?'] },
      treatment: { right: ['Seu Raimundo', 'happy', 'Vou bebendo o soro enquanto o exame sai. Já me sinto mais seguro.'], wrong: ['Seu Raimundo', 'sick', 'A febre e a moleza continuam, {doc}… e agora?'] },
    },
    intro: {
      title: 'Seu Raimundo chegou à UBS',
      quote: '“Doutor, essa febre não me larga desde segunda. Dói tudo, até atrás dos olhos.”',
      cite: '— Seu Raimundo',
      hint: 'Aproxime-se da recepção para chamar Seu Raimundo e abrir a consulta.',
    },
    actions: ['Chamar o paciente na recepção', 'Conversar com o paciente', 'Examinar o paciente', 'Registrar a conduta'],
    objectives: [
      'Chame o paciente para a consulta.',
      'Converse com Seu Raimundo e descubra duas pistas.',
      'Examine Seu Raimundo e classifique o caso.',
      'Escolha a conduta inicial para Seu Raimundo.',
    ],
    history: {
      title: 'O que está sentindo?',
      prompt: 'O que você quer perguntar a Seu Raimundo?',
      next: 'Examinar Seu Raimundo',
      clues: [
        ['Perguntar sobre a febre e as dores', 'A febre começou de repente há três dias e chegou a 39 °C, com dor de cabeça, dor atrás dos olhos e dor no corpo. Dois vizinhos tiveram dengue neste mês.'],
        ['Perguntar sobre sinais de alarme e saúde prévia', 'Não tem dor na barriga, vômitos, tontura ao levantar nem sangramento de gengiva ou nariz. Tem diabetes tipo 2 e usa metformina. Ainda não tomou remédio para a febre.'],
      ],
    },
    exam: {
      title: 'Observe os sinais',
      hint: 'Faça as duas avaliações para classificar o caso.',
      clues: [
        ['Aferir sinais vitais e avaliar a circulação', 'Temperatura 38,4 °C, FC 92 bpm. PA 128/80 mmHg deitado e 124/78 mmHg em pé, sem tontura. Extremidades quentes e enchimento capilar menor que 2 segundos.'],
        ['Examinar o abdome e fazer a prova do laço', 'Abdome indolor, fígado não palpável. Na prova do laço, você conta 24 petéquias no quadrado de 2,5 cm do antebraço.'],
      ],
    },
    classify: {
      prompt: 'Em qual grupo de estadiamento da dengue Seu Raimundo se encaixa?',
      next: 'Escolher a conduta',
      correct: 1,
      choices: [
        ['Grupo A', 'Seu Raimundo tem diabetes, uma comorbidade, e a prova do laço deu positiva: 24 petéquias, quando em adultos o corte é 20. Isso tira o caso do grupo A.'],
        ['Grupo B', 'Não há sinais de alarme nem de choque, mas há comorbidade (diabetes) e prova do laço positiva. Esses achados colocam o caso no grupo B.'],
        ['Grupo C', 'O grupo C exige pelo menos um sinal de alarme, como dor abdominal intensa, vômitos persistentes, hipotensão postural ou sangramento de mucosa. Nenhum deles está presente.'],
        ['Grupo D', 'O grupo D reúne choque, sangramento grave ou disfunção grave de órgãos. O pulso, a pressão e o enchimento capilar de Seu Raimundo estão normais.'],
      ],
    },
    treatment: {
      summary: 'Provável dengue no 3º dia, sem sinais de alarme, com diabetes e prova do laço positiva. Circulação estável.',
      prompt: 'Qual é a melhor conduta inicial?',
      next: 'Encerrar o atendimento',
      correct: 2,
      choices: [
        ['Prescrever hidratação oral e dar alta com retorno no 5º dia', 'Essa é a conduta do grupo A. No grupo B, o hemograma é obrigatório e o paciente aguarda o resultado em observação.'],
        ['Prescrever ibuprofeno para a febre e as dores', 'Anti-inflamatórios e salicilatos devem ser evitados na dengue, pelo risco de sangramento. Para febre e dor, usa-se paracetamol ou dipirona.'],
        ['Colher hemograma, iniciar hidratação oral e observar até o resultado', 'No grupo B, o hemograma completo é obrigatório. Enquanto aguarda, o paciente recebe hidratação oral como no grupo A e fica em observação para reavaliação.'],
        ['Internar e iniciar expansão com soro fisiológico', 'A expansão com soro é conduta do grupo C (com sinal de alarme) ou do grupo D (com choque). Seu Raimundo está estável e sem sinais de alarme.'],
      ],
    },
    outcome: {
      title: 'Seu Raimundo segue acompanhado',
      quote: '“Vou beber bastante líquido e volto amanhã. Já sei quais sinais me fazem voltar antes.”',
      cite: '— Seu Raimundo, após a reavaliação',
      text: 'Na simulação, o hemograma não mostrou hemoconcentração. Seu Raimundo saiu com o cartão da dengue, o caso foi notificado e ele retorna todos os dias para reavaliação até 48 horas depois de a febre passar.',
      badge: 'Vigia das arboviroses',
    },
    sources: [
      { label: 'Ministério da Saúde · Dengue: diagnóstico e manejo clínico, 6ª ed. (2024)', url: 'https://portaldeboaspraticas.iff.fiocruz.br/wp-content/uploads/2024/02/dengue-manejo-clinico.pdf' },
      { label: 'Ministério da Saúde · Dengue: manual de enfermagem, 3ª ed. (2026)', url: 'https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/guias-e-manuais/2026/dengue-manual-de-enfermagem.pdf' },
    ],
  },

  {
    id: 'antonio',
    theme: 'tb',
    number: '003',
    specialty: 'PNEUMOLOGIA',
    minutes: 6,
    title: 'A tosse que não passa',
    heading: ['A tosse que', 'não passa'],
    summary: 'Tosse há um mês, febre no fim da tarde e roupas cada vez mais largas. A agente comunitária pediu que ele viesse hoje.',
    patient: {
      name: 'Seu Antônio',
      card: '45 anos · Pedreiro, veio sozinho',
      short: 'Seu Antônio · 45 anos',
      colors: ['#1d1a18', '#2f2924', '#231f1c', '#5e3a26', '#8c5a3a', '#a9744f', '#b0643a', '#d08a5a', '#4a4a3a', '#e2c35a'],
    },
    look: { skin: '#8a5636', hairStyle: 'raspado', hairColor: '#1d1a18', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#c96a3a', pants: '#4a4a3a', acc: [] },
    maskFromPhase: 1,
    arrival: '*cof cof* Com licença… a agente de saúde disse que eu tinha que vir hoje.',
    returnLine: '{doc}! Lembra de mim? Vim mostrar que estou seguindo o tratamento direitinho.',
    reactions: {
      classify: { right: ['Seu Antônio', 'neutral', 'Tuberculose? O colega da obra teve… faz sentido investigar.'], wrong: ['Seu Antônio', 'sick', 'Mas já faz um mês, {doc}… e eu perdi tanto peso. Não parece resfriado.'] },
      treatment: { right: ['Seu Antônio', 'happy', 'Vou colher o escarro agora mesmo. Quero saber logo e proteger minha família.'], wrong: ['Seu Antônio', 'sick', 'E se eu continuar tossindo perto dos meus filhos sem saber o que é?'] },
    },
    intro: {
      title: 'Seu Antônio chegou à UBS',
      quote: '“A agente de saúde insistiu para eu vir. Essa tosse já tem um mês e o xarope não resolveu.”',
      cite: '— Seu Antônio',
      hint: 'Ele está tossindo na recepção. Chame Seu Antônio, ofereça uma máscara cirúrgica e atenda em sala arejada.',
    },
    actions: ['Chamar o paciente na recepção', 'Conversar com o paciente', 'Examinar o paciente', 'Registrar a conduta'],
    objectives: [
      'Chame o paciente e ofereça uma máscara.',
      'Converse com Seu Antônio e descubra duas pistas.',
      'Examine Seu Antônio e interprete o quadro.',
      'Escolha a conduta inicial para Seu Antônio.',
    ],
    history: {
      title: 'Há quanto tempo?',
      prompt: 'O que você quer perguntar a Seu Antônio?',
      next: 'Examinar Seu Antônio',
      clues: [
        ['Perguntar sobre a tosse', 'Tosse há quatro semanas, com catarro amarelado pela manhã. Nunca viu sangue no catarro. O xarope caseiro não ajudou.'],
        ['Perguntar sobre febre, peso e contatos', 'Sente febre baixa no fim da tarde e acorda suado à noite. Perdeu cerca de 6 kg em dois meses. Um colega de obra tratou tuberculose no ano passado.'],
      ],
    },
    exam: {
      title: 'Observe os sinais',
      hint: 'Faça as duas avaliações para interpretar o quadro.',
      clues: [
        ['Aferir sinais vitais e o peso', 'Temperatura 37,6 °C, FC 90 bpm, FR 18 irpm, SpO₂ 96% em ar ambiente, PA 120/78 mmHg. Pesa 58 kg; o cartão da UBS registrava 64 kg há três meses.'],
        ['Auscultar o tórax', 'Ele está emagrecido, mas respira sem esforço. Há estertores finos no ápice do pulmão direito, sem sibilos.'],
      ],
    },
    classify: {
      prompt: 'Como você interpreta o quadro de Seu Antônio?',
      next: 'Escolher a conduta',
      correct: 1,
      choices: [
        ['Resfriado comum, que melhora sozinho', 'Resfriados duram poucos dias. Tosse por três semanas ou mais, com febre no fim da tarde, suor noturno e perda de peso, exige investigação.'],
        ['Pessoa com sintoma respiratório: investigar tuberculose pulmonar', 'Na população geral, tosse por três semanas ou mais define a pessoa com sintoma respiratório. Febre vespertina, suor noturno, emagrecimento e contato com tuberculose reforçam a suspeita.'],
        ['Crise de asma', 'Não há sibilos nem falta de ar, e asma não explica febre, suor noturno e perda de peso.'],
        ['Pneumonia grave com internação imediata', 'Seu Antônio está estável: saturação de 96%, frequência respiratória normal e sem esforço para respirar. O quadro arrastado aponta para outra hipótese.'],
      ],
    },
    treatment: {
      summary: 'Tosse há quatro semanas, febre vespertina, suor noturno, perda de 6 kg e contato com tuberculose. Estável, com estertores no ápice direito.',
      prompt: 'Qual é a melhor conduta inicial?',
      next: 'Encerrar o atendimento',
      correct: 2,
      choices: [
        ['Prescrever amoxicilina e reavaliar em 30 dias', 'Antibiótico sem investigação atrasa o diagnóstico e mantém a transmissão. O quadro pede exame de escarro já nesta consulta.'],
        ['Iniciar o tratamento para tuberculose hoje, sem exames', 'Antes de tratar, busca-se a confirmação bacteriológica. O exame de escarro também mostra se há resistência à rifampicina.'],
        ['Colher escarro para teste rápido molecular (TRM-TB) e pedir radiografia de tórax', 'O TRM-TB é o método de escolha para identificar casos novos de tuberculose pulmonar e também detecta resistência à rifampicina. A radiografia de tórax complementa a investigação.'],
        ['Liberar com xarope e orientar retorno se piorar', 'Ele já tem critério de pessoa com sintoma respiratório. Liberar sem exame perde a chance de diagnóstico e de interromper a transmissão.'],
      ],
    },
    outcome: {
      title: 'Diagnóstico confirmado a tempo',
      quote: '“Agora entendi por que precisava investigar. Vou seguir o tratamento até o fim.”',
      cite: '— Seu Antônio, no retorno',
      text: 'Na simulação, o TRM-TB detectou o bacilo, sem resistência à rifampicina. A equipe enviou a amostra para cultura e teste de sensibilidade, ofertou teste rápido de HIV, notificou o caso, iniciou o tratamento com acompanhamento na UBS e chamou os contatos para avaliação.',
      badge: 'Caçador de bacilos',
    },
    sources: [
      { label: 'Ministério da Saúde · Tuberculose: diagnóstico', url: 'https://www.gov.br/aids/pt-br/assuntos/tuberculose/diagnostico' },
      { label: 'Ministério da Saúde · Tuberculose na APS: protocolo de enfermagem (2022)', url: 'https://www.gov.br/saude/pt-br/centrais-de-conteudo/publicacoes/svsa/tuberculose/tuberculose-na-atencao-primaria-a-saude-protocolo-de-enfermagem.pdf' },
    ],
  },

  {
    id: 'socorro',
    theme: 'diabetes',
    number: '004',
    specialty: 'CLÍNICA MÉDICA',
    minutes: 6,
    title: 'Sede, urina e cansaço',
    heading: ['Sede, urina', 'e cansaço'],
    summary: 'Há dois meses bebe água o dia todo e levanta à noite para urinar. Trouxe exames de uma campanha do bairro.',
    patient: {
      name: 'Dona Socorro',
      card: '52 anos · Merendeira, veio sozinha',
      short: 'Dona Socorro · 52 anos',
      colors: ['#1f1a1c', '#3b2a22', '#2a1e1a', '#7a4a2c', '#a8683f', '#c98a5e', '#c96a3a', '#e89a6a', '#3a3f4a', '#f1bf66'],
    },
    look: { skin: '#a8683f', hairStyle: 'coque', hairColor: '#2a1e1a', eyes: '#2b1d14', outfit: 'avental', outfitColor: '#c96a3a', inner: '#f1bf66', pants: '#3a3f4a', acc: ['brinco'] },
    arrival: '{doc}, ando com uma sede que não passa… e trouxe uns exames da campanha do bairro.',
    returnLine: '{doc}! Estou caminhando todo dia depois do serviço. Vim treinar de novo com você.',
    reactions: {
      classify: { right: ['Dona Socorro', 'neutral', 'Então é diabetes mesmo… minha mãe também tinha. O que eu faço agora?'], wrong: ['Dona Socorro', 'sad', 'Mas, {doc}, os dois exames vieram altos e eu continuo com essa sede…'] },
      treatment: { right: ['Dona Socorro', 'happy', 'Entendi o remédio e o que preciso mudar. E vou fazer os exames dos olhos, dos rins e dos pés.'], wrong: ['Dona Socorro', 'sad', 'Fiquei confusa, {doc}. Isso resolve mesmo o meu caso?'] },
    },
    intro: {
      title: 'Dona Socorro chegou à UBS',
      quote: '“Bebo água o dia inteiro e ainda levanto de madrugada para fazer xixi.”',
      cite: '— Dona Socorro',
      hint: 'Aproxime-se da recepção para chamar Dona Socorro e abrir a consulta.',
    },
    actions: ['Chamar a paciente na recepção', 'Conversar com a paciente', 'Examinar a paciente', 'Registrar a conduta'],
    objectives: [
      'Chame a paciente para a consulta.',
      'Converse com Dona Socorro e descubra duas pistas.',
      'Examine Dona Socorro e interprete os exames.',
      'Escolha a conduta inicial para Dona Socorro.',
    ],
    history: {
      title: 'O que está sentindo?',
      prompt: 'O que você quer perguntar a Dona Socorro?',
      next: 'Examinar Dona Socorro',
      clues: [
        ['Perguntar sobre sede, urina e peso', 'Há dois meses tem muita sede, urina muito e acorda duas vezes por noite para urinar. Perdeu cerca de 2 kg sem querer e às vezes a visão fica embaçada. Não tem vômitos, dor abdominal nem falta de ar.'],
        ['Perguntar sobre família, hábitos e remédios', 'A mãe teve diabetes e a irmã tem pressão alta. Não faz atividade física e almoça na escola, com muito arroz e refrigerante. Não usa remédio nenhum. Nunca teve infarto, AVC ou problema nos rins.'],
      ],
    },
    exam: {
      title: 'Exame e exames trazidos',
      hint: 'Faça as duas avaliações para interpretar o caso.',
      clues: [
        ['Medir PA, peso e cintura e olhar a pele', 'PA 134/86 mmHg. IMC 31 kg/m² e cintura de 102 cm. Pele mais escura e aveludada no pescoço (acantose nigricans). Respira tranquila, mucosas úmidas.'],
        ['Ler os exames da campanha e examinar os pés', 'Glicemia de jejum de 142 mg/dL e HbA1c de 8,1% no mesmo dia, mês passado. Glicemia capilar hoje, 2 h após o almoço: 248 mg/dL. Pés íntegros, monofilamento de 10 g sentido em todos os pontos e pulsos pediosos presentes.'],
      ],
    },
    classify: {
      prompt: 'Como você interpreta o quadro de Dona Socorro?',
      next: 'Escolher a conduta',
      correct: 2,
      choices: [
        ['Pré-diabetes: repetir os exames em um ano', 'Jejum ≥126 mg/dL e HbA1c ≥6,5% estão na faixa de diabetes, não de pré-diabetes.'],
        ['Hiperglicemia de estresse, sem diagnóstico ainda', 'Dois critérios alterados na mesma amostra, com sintomas clássicos, já confirmam o diagnóstico.'],
        ['Diabetes mellitus tipo 2 confirmado', 'Jejum de 142 e HbA1c de 8,1% são dois resultados na faixa de diabetes. Com obesidade central, acantose e história familiar, o quadro é típico de DM2.'],
        ['Cetoacidose diabética', 'Não há vômitos, dor abdominal, respiração de Kussmaul nem desidratação. Ela está estável e respira tranquila.'],
      ],
    },
    treatment: {
      summary: 'DM2 recém-diagnosticado, HbA1c 8,1%, sintomas clássicos leves, sem crise aguda nem catabolismo intenso. Obesidade, PA limítrofe, sem DCV ou DRC conhecidas.',
      prompt: 'Qual é a melhor conduta inicial?',
      next: 'Encerrar o atendimento',
      correct: 1,
      choices: [
        ['Só orientar dieta e repetir a HbA1c em um ano', 'Com HbA1c de 8,1% e sintomas, o tratamento farmacológico já é indicado, e a reavaliação deve ser em cerca de 3 meses.'],
        ['Mudança de estilo de vida + metformina, rastrear complicações (fundo de olho, RAC, TFGe, pés, lipídios) e reavaliar a HbA1c em cerca de 3 meses', 'Metformina é a escolha frequente sem comorbidade dominante, com baixo risco de hipoglicemia. O rastreio de retina, rim e pés começa no diagnóstico do DM2.'],
        ['Iniciar insulina basal e prandial hoje', 'Insulina precoce fica para catabolismo importante, HbA1c >10% ou glicemia ≥300 mg/dL. Não é o caso.'],
        ['Iniciar gliclazida e liberar sem retorno marcado', 'A sulfonilureia não é a primeira escolha aqui e traz risco de hipoglicemia e ganho de peso. Faltariam o rastreio de complicações e o seguimento.'],
      ],
    },
    outcome: {
      title: 'Dona Socorro começa o tratamento',
      quote: '“Vou tomar a metformina junto com a comida e já marquei o exame dos olhos.”',
      cite: '— Dona Socorro, ao sair do consultório',
      text: 'Na simulação, Dona Socorro saiu com metformina em dose inicial baixa, plano de caminhadas, orientação alimentar e pedidos de RAC, TFGe, perfil lipídico e fundo de olho. O retorno ficou para cerca de 3 meses, com nova HbA1c.',
      badge: 'Detetive da glicemia',
    },
    sources: [
      { label: 'ADA · Standards of Care in Diabetes 2026, seção 2 (diagnóstico)', url: 'https://doi.org/10.2337/dc26-S002' },
      { label: 'ADA · Standards of Care in Diabetes 2026, seção 9 (tratamento farmacológico)', url: 'https://doi.org/10.2337/dc26-S009' },
    ],
  },

  {
    id: 'zelia',
    theme: 'diabetes',
    number: '005',
    specialty: 'CLÍNICA MÉDICA',
    minutes: 5,
    title: 'Suor frio na sala de espera',
    heading: ['Suor frio na', 'sala de espera'],
    summary: 'Dona Zélia veio colher sangue em jejum e começou a tremer e suar na fila. A filha pede ajuda.',
    patient: {
      name: 'Dona Zélia',
      card: '71 anos · Aposentada, acompanhada pela filha, Márcia',
      short: 'Dona Zélia · 71 anos',
      colors: ['#2a2622', '#d9d9d9', '#a8a8a8', '#8a5a3c', '#c48c64', '#e0b08a', '#8e5bb9', '#b98ad9', '#3a3f4a', '#e8508a'],
    },
    look: { skin: '#c48c64', hairStyle: 'curto', hairColor: '#d9d9d9', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#8e5bb9', pants: '#3a3f4a', acc: ['oculos'] },
    companion: { name: 'Márcia', role: 'filha da Dona Zélia', look: { skin: '#c48c64', hairStyle: 'longo', hairColor: '#2a1e1a', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#3f8a6a', pants: '#2a2a33', acc: ['brinco'] } },
    arrival: '{doc}, minha mãe está tremendo e suando frio aqui na fila!',
    returnLine: '{doc}! Agora a mãe sempre leva o comprimido de glicose na bolsa.',
    reactions: {
      classify: { right: ['Márcia', 'neutral', 'Então foi o açúcar que baixou demais? E é perigoso assim?'], wrong: ['Márcia', 'sad', 'Mas o aparelho marcou menos de 50, {doc}… isso não é grave?'] },
      treatment: { right: ['Márcia', 'happy', 'Ela já parou de tremer e está conversando normal. Que susto!'], wrong: ['Márcia', 'sad', 'Ela continua suando e meio confusa, {doc}…'] },
    },
    intro: {
      title: 'Dona Zélia passa mal na UBS',
      quote: '“Ela veio em jejum para o exame e começou a tremer na fila.”',
      cite: '— Márcia, filha da Dona Zélia',
      hint: 'Aproxime-se da recepção para atender Dona Zélia.',
    },
    actions: ['Chamar a paciente na recepção', 'Conversar com a acompanhante', 'Examinar a paciente', 'Registrar a conduta'],
    objectives: [
      'Chame a paciente para o atendimento.',
      'Converse com Márcia e descubra duas pistas.',
      'Examine Dona Zélia e classifique o episódio.',
      'Escolha a conduta para Dona Zélia.',
    ],
    history: {
      title: 'O que aconteceu?',
      prompt: 'O que você quer perguntar a Márcia?',
      next: 'Examinar Dona Zélia',
      clues: [
        ['Perguntar sobre remédios e alimentação', 'Dona Zélia tem DM2 e usa metformina e gliclazida de manhã. Hoje tomou a gliclazida às 6 h, como sempre, mas ficou sem café para colher o exame de sangue.'],
        ['Perguntar sobre episódios anteriores e saúde', 'Já acordou suada à noite algumas vezes no último mês. No último exame, a TFGe estava em 38 mL/min/1,73 m². Não tem glucagon em casa.'],
      ],
    },
    exam: {
      title: 'Avalie com calma e rapidez',
      hint: 'Faça as duas avaliações antes de decidir.',
      clues: [
        ['Avaliar consciência e se ela consegue engolir', 'Está pálida, suada e trêmula, mas acordada, responde às perguntas e engole água sem engasgar. FC 104 bpm, PA 142/84 mmHg.'],
        ['Medir a glicemia capilar', 'O glicosímetro marca 49 mg/dL. Você confirma a leitura em uma segunda gota: 48 mg/dL.'],
      ],
    },
    classify: {
      prompt: 'Como você classifica esta hipoglicemia (níveis da ADA)?',
      next: 'Escolher a conduta',
      correct: 1,
      choices: [
        ['Nível 1', 'O nível 1 vai de 54 a <70 mg/dL. Com 48 mg/dL, o valor já está abaixo de 54.'],
        ['Nível 2', 'Glicose <54 mg/dL é hipoglicemia clinicamente significativa. Ela está alerta e consegue se tratar, então não é nível 3.'],
        ['Nível 3', 'O nível 3 exige alteração física ou mental que impeça a pessoa de se tratar sozinha. Dona Zélia está alerta e engole bem.'],
        ['Não é hipoglicemia, é crise de ansiedade', 'Sintomas autonômicos com glicemia de 48 mg/dL em quem usa sulfonilureia confirmam hipoglicemia.'],
      ],
    },
    treatment: {
      summary: 'Hipoglicemia nível 2 por gliclazida em jejum, idosa com TFGe 38, alerta e engolindo. Episódios noturnos prévios.',
      prompt: 'Qual é a melhor conduta?',
      next: 'Encerrar o atendimento',
      correct: 3,
      choices: [
        ['Aplicar glucagon e liberar assim que a glicose subir', 'Ela está alerta e engole bem: a via oral é a escolha. Liberar logo é perigoso, porque a gliclazida continua agindo por horas.'],
        ['Oferecer chocolate ou pão com manteiga', 'Gordura e proteína atrasam a absorção. Use glicose de ação rápida.'],
        ['Aplicar soro glicosado e encaminhar à emergência sem dar nada pela boca', 'Nada pela boca é para quem não engole com segurança. Dona Zélia está alerta, então a correção oral é imediata e eficaz.'],
        ['Dar 15 g de glicose oral, medir de novo em 15 min e repetir se <70; depois, lanche, observação prolongada e revisão do esquema com a sulfonilureia', 'É a regra dos 15 para quem está alerta. A sulfonilureia pode causar nova queda por horas, e TFGe baixa e idade pedem rever a gliclazida e as metas.'],
      ],
    },
    outcome: {
      title: 'Dona Zélia se recuperou',
      quote: '“Depois do lanche fiquei boa. Nunca mais tomo o remédio sem comer.”',
      cite: '— Dona Zélia, após a observação',
      text: 'Na simulação, a glicemia subiu para 96 mg/dL em 15 minutos e se manteve estável na observação. A equipe revisou o esquema (suspensão da gliclazida, com plano para outra classe), ensinou a regra dos 15 à família e registrou o evento de nível 2.',
      badge: 'Guardião do açúcar',
    },
    sources: [
      { label: 'ADA · Standards of Care in Diabetes 2026, seção 6 (hipoglicemia)', url: 'https://doi.org/10.2337/dc26-S006' },
    ],
  },

  {
    id: 'joaquim',
    theme: 'diabetes',
    number: '006',
    specialty: 'URGÊNCIA',
    minutes: 6,
    title: 'Vômitos e respiração funda',
    heading: ['Vômitos e', 'respiração funda'],
    summary: 'Dois dias vomitando e comendo quase nada. A glicemia nem está tão alta, mas Seu Joaquim respira fundo e rápido.',
    patient: {
      name: 'Seu Joaquim',
      card: '58 anos · Motorista, veio com a esposa, Rosa',
      short: 'Seu Joaquim · 58 anos',
      colors: ['#1d1a18', '#4a4540', '#2e2a26', '#6e4630', '#9c6a48', '#be8c66', '#3a6ea8', '#7fb6ea', '#2a2a33', '#e9b949'],
    },
    look: { skin: '#9c6a48', hairStyle: 'raspado', hairColor: '#4a4540', eyes: '#2b1d14', outfit: 'colete', outfitColor: '#3a6ea8', inner: '#e8e2d0', pants: '#2a2a33', acc: ['bone'] },
    companion: { name: 'Rosa', role: 'esposa do Seu Joaquim', look: { skin: '#b07a52', hairStyle: 'cacheado', hairColor: '#3b2a20', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#d36a8a', pants: '#3a3f4a', acc: [] } },
    arrival: '{doc}, ele não para de vomitar e está respirando esquisito, bem fundo…',
    returnLine: 'Oi, {doc}! O Joaquim agora tem um plano escrito para quando ficar doente.',
    reactions: {
      classify: { right: ['Rosa', 'sad', 'Mesmo com o açúcar em 186? Eu achei que só era grave se passasse de 300…'], wrong: ['Rosa', 'sad', '{doc}, mas olha como ele respira… e esse cheiro de fruta no hálito?'] },
      treatment: { right: ['Rosa', 'neutral', 'A ambulância já está vindo. Separei a caixa de remédios dele para levar.'], wrong: ['Rosa', 'sad', 'Ele está cada vez mais sonolento, {doc}…'] },
    },
    intro: {
      title: 'Seu Joaquim chegou à UBS',
      quote: '“Ele pegou uma virose e desde anteontem não para nada no estômago.”',
      cite: '— Rosa, esposa do Seu Joaquim',
      hint: 'Aproxime-se da recepção para chamar Seu Joaquim.',
    },
    actions: ['Chamar o paciente na recepção', 'Conversar com a acompanhante', 'Examinar o paciente', 'Registrar a conduta'],
    objectives: [
      'Chame o paciente para o atendimento.',
      'Converse com Rosa e descubra duas pistas.',
      'Examine Seu Joaquim e levante a hipótese.',
      'Escolha a conduta para Seu Joaquim.',
    ],
    history: {
      title: 'O que aconteceu?',
      prompt: 'O que você quer perguntar a Rosa?',
      next: 'Examinar Seu Joaquim',
      clues: [
        ['Perguntar sobre os sintomas e a alimentação', 'Há dois dias tem vômitos várias vezes ao dia, dor na barriga e quase não come nem bebe. Hoje ficou ofegante e mais quieto.'],
        ['Perguntar sobre o diabetes e os remédios', 'Tem DM2 há 10 anos. Usa metformina e, há seis meses, empagliflozina. Continuou tomando os dois comprimidos mesmo vomitando.'],
      ],
    },
    exam: {
      title: 'Observe os sinais',
      hint: 'Faça as duas avaliações para levantar a hipótese.',
      clues: [
        ['Avaliar respiração, hidratação e sinais vitais', 'Respiração profunda e rápida (FR 28), hálito frutado, mucosas secas. FC 118 bpm, PA 104/66 mmHg, enchimento capilar de 3 s. Sonolento, mas responde.'],
        ['Medir glicemia e cetonas', 'Glicemia capilar de 186 mg/dL. A cetonemia capilar da unidade marca 4,8 mmol/L e a fita urinária, cetonúria 3+.'],
      ],
    },
    classify: {
      prompt: 'Qual é a hipótese mais provável?',
      next: 'Escolher a conduta',
      correct: 2,
      choices: [
        ['Gastroenterite com desidratação leve, sem relação com o diabetes', 'Kussmaul, hálito frutado e cetonemia de 4,8 mmol/L não se explicam por desidratação simples.'],
        ['Glicemia abaixo de 200 afasta qualquer crise diabética', 'Pelo consenso de 2024, glicose <200 pode acompanhar CAD em quem tem diabetes, sobretudo com iSGLT2, jejum ou vômitos.'],
        ['Suspeita de cetoacidose diabética euglicêmica associada ao iSGLT2', 'Há diabetes, cetose importante e sinais clínicos de acidose (Kussmaul). A gasometria confirmará o componente ácido no hospital.'],
        ['Estado hiperglicêmico hiperosmolar', 'O EHH exige glicose ≥600 mg/dL e cetonemia <3 mmol/L. Aqui a glicose está em 186 e as cetonas estão altas.'],
      ],
    },
    treatment: {
      summary: 'DM2 em uso de empagliflozina, vômitos e baixa ingestão. Kussmaul, hálito frutado, hipovolemia, sonolência. Glicemia de 186 e cetonemia de 4,8 mmol/L.',
      prompt: 'Qual é a melhor conduta na UBS?',
      next: 'Encerrar o atendimento',
      correct: 0,
      choices: [
        ['Acionar o SAMU 192 para transferência urgente, puncionar acesso e iniciar cristaloide isotônico, suspender a empagliflozina e enviar a lista de remédios', 'CAD exige tratamento hospitalar monitorizado: volume, potássio antes da insulina, insulina IV e, por ser euglicêmica, dextrose desde o início. O iSGLT2 fica suspenso.'],
        ['Aplicar insulina rápida subcutânea e liberar para casa', 'Insulina sem dosar potássio pode causar hipocalemia grave, e a CAD precisa de monitorização hospitalar.'],
        ['Prescrever antiemético e hidratação oral em casa', 'Vômitos persistentes, respiração profunda e sonolência são sinais de urgência. O tratamento domiciliar atrasa o diagnóstico.'],
        ['Fazer bicarbonato de sódio IV na UBS', 'Bicarbonato não é rotina na CAD; o consenso reserva para pH <7,0 em ambiente monitorizado.'],
      ],
    },
    outcome: {
      title: 'Seu Joaquim foi transferido a tempo',
      quote: '“No hospital disseram que o açúcar enganou: era cetoacidose mesmo.”',
      cite: '— Rosa, no retorno à UBS',
      text: 'Na simulação, a gasometria mostrou pH 7,18 e HCO₃⁻ de 11 mmol/L. Ele recebeu volume, potássio, insulina IV com dextrose e teve alta após a resolução (BHB <0,6). A empagliflozina ficou suspensa e a equipe montou um plano escrito para dias de doença.',
      badge: 'Farejador de cetonas',
    },
    sources: [
      { label: 'Umpierrez et al. · Consenso de crises hiperglicêmicas em adultos, Diabetes Care 2024', url: 'https://doi.org/10.2337/dci24-0032' },
      { label: 'SBD · Diagnóstico e tratamento da cetoacidose diabética (2026)', url: 'https://diretriz.diabetes.org.br/diagnostico-e-tratamento-da-cetoacidose-diabetica/' },
    ],
  },

  {
    id: 'benedito',
    theme: 'diabetes',
    number: '007',
    specialty: 'CLÍNICA MÉDICA',
    minutes: 6,
    title: 'A ferida que não dói',
    heading: ['A ferida que', 'não dói'],
    summary: 'Uma ferida na sola do pé há três semanas, que só foi notada pela meia suja. Seu Benedito diz que não sente nada.',
    patient: {
      name: 'Seu Benedito',
      card: '66 anos · Agricultor, veio sozinho',
      short: 'Seu Benedito · 66 anos',
      colors: ['#2a2622', '#e8e8e8', '#b0b0b0', '#5e3a24', '#8a5a3a', '#ad7a56', '#7a2e3a', '#b0505e', '#4e5969', '#e9b949'],
    },
    look: { skin: '#8a5a3a', hairStyle: 'curto', hairColor: '#e8e8e8', eyes: '#2b1d14', outfit: 'camiseta', outfitColor: '#7a2e3a', pants: '#4e5969', acc: ['chapeu'] },
    arrival: 'Bom dia, {doc}. Minha mulher mandou eu mostrar essa ferida no pé. Mas não dói nada, viu?',
    returnLine: '{doc}! A ferida fechou. Agora só ando de sapato fechado e olho o pé todo dia.',
    reactions: {
      classify: { right: ['Seu Benedito', 'neutral', 'Então não dói porque o nervo do pé está fraco? Eu nem imaginava.'], wrong: ['Seu Benedito', 'sad', 'Hum… mas o pé está quentinho, sem pus e sem vermelhidão, {doc}.'] },
      treatment: { right: ['Seu Benedito', 'happy', 'Vou usar a bota direitinho e volto para o curativo. Quero salvar esse pé.'], wrong: ['Seu Benedito', 'sad', 'A ferida continua igual, {doc}… será que vai fechar?'] },
    },
    intro: {
      title: 'Seu Benedito chegou à UBS',
      quote: '“Só vi a ferida porque a meia ficou suja. Não sinto nada.”',
      cite: '— Seu Benedito',
      hint: 'Aproxime-se da recepção para chamar Seu Benedito.',
    },
    actions: ['Chamar o paciente na recepção', 'Conversar com o paciente', 'Examinar o pé', 'Registrar a conduta'],
    objectives: [
      'Chame o paciente para a consulta.',
      'Converse com Seu Benedito e descubra duas pistas.',
      'Examine o pé e classifique a lesão.',
      'Escolha a conduta para Seu Benedito.',
    ],
    history: {
      title: 'Como surgiu a ferida?',
      prompt: 'O que você quer perguntar a Seu Benedito?',
      next: 'Examinar o pé',
      clues: [
        ['Perguntar sobre a ferida e o calçado', 'A ferida apareceu há três semanas sob o dedão, onde havia um calo grosso. Trabalha na roça de chinelo. Não teve febre nem mal-estar.'],
        ['Perguntar sobre o diabetes e os sintomas nos pés', 'Tem DM2 há 15 anos, a última HbA1c foi 8,9%. À noite sente queimação e formigamento nos dois pés. Não sente dor ao caminhar. Fuma meio maço por dia.'],
      ],
    },
    exam: {
      title: 'Examine o pé',
      hint: 'Faça as duas avaliações para classificar a lesão.',
      clues: [
        ['Testar sensibilidade e pulsos', 'Não sente o monofilamento de 10 g em 6 de 8 pontos, e a vibração do diapasão está abolida no hálux. Pulsos pediosos e tibiais posteriores palpáveis, pé quente, pele seca e com fissuras.'],
        ['Inspecionar a úlcera e sondar o fundo', 'Úlcera de 1,5 cm sob a cabeça do 1º metatarso, rodeada de calo, com fundo rosado. Sem eritema ao redor, calor, edema, dor ou secreção. A sonda não toca osso.'],
      ],
    },
    classify: {
      prompt: 'Como você classifica a lesão de Seu Benedito?',
      next: 'Escolher a conduta',
      correct: 1,
      choices: [
        ['Úlcera isquêmica por doença arterial periférica', 'Os pulsos estão palpáveis e o pé está quente. O padrão é de pé neuropático, não isquêmico.'],
        ['Úlcera neuropática plantar, sem sinais de infecção', 'Perda da sensibilidade protetora, calo e pressão repetida explicam a úlcera. Sem dois ou mais sinais inflamatórios, não há infecção, só colonização.'],
        ['Infecção moderada do pé diabético', 'Infecção é diagnóstico clínico, com pelo menos dois sinais locais (eritema, calor, edema, dor ou pus). Nenhum está presente.'],
        ['Neuroartropatia de Charcot aguda', 'O Charcot agudo se apresenta como pé quente, vermelho e edemaciado, em geral com pele íntegra. Aqui há uma úlcera plantar sob calo.'],
      ],
    },
    treatment: {
      summary: 'Úlcera neuropática plantar sob a cabeça do 1º metatarso, sem infecção e sem isquemia. Perda da sensibilidade protetora, HbA1c 8,9%, tabagista.',
      prompt: 'Qual é a melhor conduta?',
      next: 'Encerrar o atendimento',
      correct: 2,
      choices: [
        ['Antibiótico oral por 14 dias e pomada no curativo', 'Sem sinais de infecção, o antibiótico não está indicado e não ajuda a úlcera a cicatrizar.'],
        ['Colher swab da superfície e aguardar a cultura para decidir', 'O swab superficial reflete colonização e pode induzir antibiótico desnecessário. O que cicatriza a úlcera é tirar a pressão.'],
        ['Descarga de pressão (offloading), desbridar o calo e o tecido inviável, curativo úmido equilibrado, educação dos pés e acompanhamento frequente', 'O offloading é o pilar: de preferência um dispositivo não removível até o joelho. Desbridar o calo, otimizar a glicemia, apoiar a cessação do tabagismo e, depois de cicatrizada, manter seguimento a cada 1–3 meses (categoria 3).'],
        ['Repouso em casa e retorno em 3 meses', 'Sem descarga de pressão e sem desbridamento a úlcera não fecha, e o risco de infecção e de amputação aumenta.'],
      ],
    },
    outcome: {
      title: 'A úlcera do Seu Benedito cicatrizou',
      quote: '“Com a bota e o curativo, fechou em oito semanas. Agora olho o pé todo dia.”',
      cite: '— Seu Benedito, no retorno',
      text: 'Na simulação, a úlcera fechou com descarga de pressão, desbridamento seriado e curativo. Ele recebeu calçado adequado, entrou no programa de cessação do tabagismo e ficou com retorno a cada 1 a 3 meses, por ser de alto risco.',
      badge: 'Escudo dos pés',
    },
    sources: [
      { label: 'IWGDF · Diretrizes do pé diabético 2023', url: 'https://iwgdfguidelines.org/guidelines-2023/' },
      { label: 'ADA · Standards of Care in Diabetes 2026, seção 12 (retina, neuropatia e pés)', url: 'https://doi.org/10.2337/dc26-S012' },
    ],
  },
];
