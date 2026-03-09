// Common English words for Word Blitz validation (3–8 letters)
export const WORD_LIST = new Set([
  // 3-letter
  "ace","act","add","age","ago","aid","aim","air","all","and","ant","any","ape","apt",
  "arc","are","ark","arm","art","ash","ask","ate","awe","axe","aye",
  "bad","bag","ban","bar","bat","bay","bed","beg","bet","big","bit","bow","box","boy","bud",
  "bug","bun","bus","but","buy",
  "cab","can","cap","car","cat","caw","cob","cod","cog","cop","cow","cry","cub","cup","cut",
  "dam","day","den","dew","did","dig","dim","dip","dog","dot","dry","dub","due","dug","dun","dye",
  "ear","eat","egg","ego","elf","elm","end","era","eve","eye",
  "fad","fan","far","fat","fax","fez","fig","fin","fit","fix","fly","fog","for","fox","fry","fun","fur",
  "gag","gap","gas","gel","gem","get","gig","gin","gnu","god","got","gum","gun","gut","guy",
  "had","ham","has","hat","hay","hem","hen","her","him","hip","his","hit","hob","hog","hop","hot","how","hub","hug","hum","hut",
  "ice","ill","imp","ink","inn","ion","ivy",
  "jab","jag","jam","jar","jaw","jay","jet","jig","job","jot","joy","jug","jut",
  "keg","key","kid","kin","kit",
  "lab","lag","lap","law","lay","leg","let","lid","lip","lit","log","lot","low",
  "mad","man","map","mar","mat","maw","men","met","mob","mod","mom","mop","mud","mug","nap","nip","nod","nor","not","now","nun","nut",
  "oak","oar","oat","odd","ode","off","oil","old","one","opt","orb","ore","our","out","owe","owl","own",
  "pad","pal","pan","pap","par","pat","paw","pay","pea","peg","pen","pep","pet","pie","pig","pin","pit","ply","pod","pop","pot","pow","pro","pub","pun","pup","pus","put",
  "rag","ram","ran","rap","rat","raw","ray","red","ref","rep","rev","rib","rid","rig","rim","rip","rob","rod","rot","row","rub","rug","rum","run","rut","rye",
  "sac","sad","sag","sap","sat","saw","say","set","sew","shy","sin","sip","sir","sis","sit","six","ski","sky","sly","sob","sod","son","sop","sot","sow","soy","spa","spy","sty","sub","sue","sum","sun","sup",
  "tab","tan","tap","tar","tea","ten","the","tie","tin","tip","toe","ton","too","top","tow","toy","tub","tug","two",
  "urn","use",
  "van","vat","vet","vex","via","vie","vow",
  "wad","war","was","wax","web","wed","who","why","wig","win","wit","woe","wok","won","woo","wow",
  "yam","yap","yew","you","yow",
  "zap","zip","zoo",

  // 4-letter
  "able","ache","acid","acre","aged","aide","ails","aims","airy","ajar","akin","aloe","also","alto","amok","amps","anew","ante","arch","area","army","atom","avid","awry","axes","axle",
  "back","bail","bait","bale","ball","balm","band","bane","bang","bank","bare","bark","barn","base","bash","bass","bask","bath","bead","beak","beam","bean","bear","beat","beef","been","beer","bees","bell","belt","bend","best","bile","bill","bird","bite","blow","blue","blur","boar","boat","bold","bolt","bomb","bond","bone","book","boom","boot","bore","born","both","bulk","bull","bunk","burn","burp","burr","bush","buzz",
  "cafe","cage","cake","calf","call","calm","came","cane","cape","care","cart","case","cash","cast","cave","cell","cent","chad","chef","chip","chop","clam","clap","claw","clay","clip","club","clue","coal","coat","coil","coin","cold","colt","comb","come","cook","cool","cope","copy","cord","core","cork","corn","cost","cozy","cram","crow","cube","curb","cure","curl","cute",
  "daft","damp","dare","dark","dart","dash","dawn","daze","dead","deaf","deal","dear","deck","deed","deep","deft","deny","desk","dial","died","diet","dirt","disk","dive","dock","doll","dome","done","doom","door","dose","dove","down","drag","draw","drip","drop","drum","duck","dull","dumb","dump","dung","dusk","dust",
  "each","earl","earn","ease","east","easy","edge","edit","else","emit","epic","even","ever","evil","exam","exit",
  "face","fact","fail","fair","fall","fame","fang","farm","fast","fate","fear","feat","feed","feel","feet","fell","felt","fend","fern","feud","fill","film","find","fine","fire","firm","fish","fist","five","flag","flat","flaw","flea","fled","flew","flex","flip","flit","flock","flow","foam","fold","fond","font","food","fool","foot","ford","fore","fork","form","fort","foul","four","free","from","fudge","fume","fuse","fuss",
  "gale","gall","game","gang","gave","gaze","gear","give","glad","glen","glow","glue","gnaw","goat","gold","golf","gone","good","goon","gore","gown","grab","grade","graft","gram","gray","grew","grin","grip","grit","grow","gulf","gull","gulp","gust",
  "hack","hail","hair","hale","hall","halt","hand","hang","hard","hare","harm","harp","harsh","haze","head","heal","heap","heat","heel","held","help","herb","here","hide","high","hike","hill","hint","hire","hiss","hold","hole","home","hood","hoop","hope","horn","hose","hour","huge","hulk","hull","hump","hunt","hurl","hurt",
  "icon","idea","idle","inch","into","iron",
  "jack","jade","jail","jazz","jest","join","joke","jolt","jump","junk","just",
  "keen","keep","kill","kind","king","kiss","knit","knob","knot","know",
  "lace","lack","lake","lamb","lamp","land","lane","lark","lash","last","late","lava","lawn","lazy","lead","leaf","leak","lean","leap","left","lend","lens","lest","lick","life","lift","lime","line","link","lion","list","live","load","loan","lock","loft","lone","long","look","loom","loop","lore","lose","loss","lost","loud","love","luck","lull","lump","lung","lure","lurk",
  "made","mail","main","make","male","mall","mane","many","mark","mars","mast","mate","maze","meal","mean","meat","meet","meld","melt","memo","mend","menu","mere","mesh","mild","milk","mill","mime","mind","mine","mint","miss","mist","mode","mold","mole","molt","mood","moon","more","most","moth","move","much","mull","must","mute",
  "nail","name","nape","navy","near","neat","need","nest","next","nice","nine","node","none","noon","norm","note","noun","numb",
  "oath","oboe","once","only","open","oval","oven","over",
  "pace","pack","page","paid","pail","pain","pair","pale","palm","pane","park","part","pass","past","path","pave","peak","peal","pear","peel","peer","pent","pick","pile","pine","pink","pipe","plan","play","plea","plod","plot","plow","plum","plus","poem","poet","pole","pond","pool","pore","port","pose","pour","prey","prod","prop","pull","pump","pure","push",
  "quay","quit","quiz",
  "race","rack","raft","rage","raid","rail","rain","rake","ramp","rang","rank","rant","rash","rate","rave","read","real","reap","reed","reel","rein","rely","rent","rest","rice","rich","ride","rife","ring","riot","rise","risk","road","roam","roar","robe","rock","role","roll","roof","rook","room","root","rope","rose","rout","rove","rude","ruin","rule",
  "sack","safe","sage","sail","sake","sale","salt","same","sand","sane","sang","sank","sash","save","scan","scar","scum","seal","seam","seen","self","sell","semi","sent","shed","shin","ship","shot","show","shut","sick","side","sigh","silk","sill","silo","sing","sink","site","size","skip","slam","slap","slew","slid","slim","slip","slot","slow","slug","smog","snap","snow","soak","soap","soar","sock","soft","soil","sold","sole","some","song","soon","soot","sort","soul","soup","sour","span","spar","spin","spit","spot","spur","stab","star","stay","stem","step","stew","stir","stop","stub","stun","such","suit","sure","swam","swat","swim","swam",
  "tack","tail","tale","tall","tame","tank","tape","task","taut","teal","team","tear","teem","tell","tend","tent","term","test","than","that","thee","them","then","they","thin","this","thorn","tick","tide","tier","tile","till","tilt","time","tiny","tire","toil","toll","tomb","tone","took","tool","tore","torn","toss","tour","town","trek","trim","trio","trip","trod","true","tuck","tuft","tune","turf","tusk","twin","twit",
  "ugly","undo","unit","upon","used","user",
  "vale","vast","veil","vein","vent","verb","very","view","vine","volt","vote",
  "wade","wage","wake","walk","wall","wand","want","ward","warm","warn","warp","wart","wash","wave","weak","wear","weed","week","weep","weld","well","went","were","west","whip","wide","wife","wild","wile","will","wilt","wind","wine","wing","wink","wire","wise","wish","with","woke","wolf","womb","wood","wool","word","wore","work","worm","worn","wove","wrap","wren","writ",
  "yard","year","yell","your",
  "zeal","zero","zinc","zone",

  // 5-letter
  "abide","about","above","abuse","acute","admit","adopt","adult","after","again","agent","agree","ahead","alarm","album","alert","alike","align","alive","allay","allow","alone","along","alter","angel","anger","angle","angry","anguish","anime","annoy","anvil","apart","apple","apply","arise","array","aside","asked","aspen","asset","attic","audio","audit","avoid","awake","aware","awful",
  "badly","baker","basic","basin","basis","beach","beard","begin","being","below","bench","berry","black","blade","blame","bland","blank","blast","blaze","bleed","bless","blind","block","blood","bloom","blown","blues","blunt","board","braid","brain","brand","brave","bread","break","brick","bride","brief","bring","broad","broke","brook","broth","brown","brush","built","bunch","burst",
  "cabin","camel","candy","carry","catch","cause","cease","chain","chair","chaos","charm","chart","chase","cheap","check","cheek","cheer","chest","chief","child","choir","chord","civil","clamp","clash","class","clean","clear","clerk","click","climb","cling","clock","clone","close","cloud","clown","clump","coast","comet","comma","coral","could","count","court","cover","crack","craft","crane","crave","crawl","crazy","cream","creek","crime","crimp","crisp","cross","crowd","crown","cruel","crush","crust","curve",
  "daily","dance","daunt","death","debut","delay","delta","demon","dense","depth","derby","devil","dirty","discs","disco","dizzy","doing","doubt","dough","draft","drain","drama","drank","drape","dream","dress","dried","drink","drive","drove","drawn","dwarf","dwell",
  "eager","early","earth","eight","elite","empty","ended","enemy","enjoy","enter","equal","error","essay","event","exact","excel","exist","extra",
  "faint","fairy","faith","fancy","fatal","fault","feast","fetch","fever","fewer","fiber","field","fifth","fifty","fight","final","first","fixed","flame","flash","flask","flick","fling","float","flock","flood","floor","flour","flute","focus","force","forge","found","frame","frank","freak","fresh","front","frost","froth","fruit","fully","funny",
  "gains","giant","given","glass","gloss","glove","grace","grade","grail","grain","grand","grant","grape","grasp","grass","grave","great","greed","green","greet","grief","gripe","groan","groom","gross","group","grove","guard","guess","guest","guide","guild","guile","guise","gusto",
  "habit","happy","hardy","harsh","haunt","haven","heart","heavy","heist","hence","herbs","hippo","hoard","hobby","honor","horse","hotel","house","humid","humor","hurry",
  "ideal","image","imply","index","inner","input","inter","ivory",
  "joust","judge","juice","juicy","jumpy",
  "karma","knock","known",
  "label","large","laser","later","laugh","layer","learn","lease","least","leave","legal","level","light","limit","linen","liner","liver","local","lodge","logic","loose","lover","lower","lucky","lunar",
  "magic","major","maker","march","masse","match","maxim","metal","media","merit","mercy","might","miles","mimic","minor","minus","mixed","model","money","month","moral","mouth","muggy","music","nadir",
  "naive","nerve","never","night","nine","nicer","noble","noise","north","noted","novel","nurse",
  "ocean","offer","often","olive","onset","orbit","order","other","outer","owned","owner",
  "paint","panic","paper","peace","pearl","pedal","penny","peril","perky","petty","phase","phone","photo","piano","pitch","pixel","place","plain","plane","plant","plate","plaza","plead","pluck","plumb","point","poker","polar","poser","power","press","price","pride","prime","print","prior","prize","probe","prone","proof","proud","prove","prowl","pulse",
  "queen","quest","queue","quite",
  "radar","radio","raise","rally","range","reach","realm","rebel","refer","reign","relax","remit","repay","reply","rider","ridge","right","rigid","rival","river","roast","robin","robot","rocky","rouge","rough","round","route","royal","rugby","ruler","rural",
  "sadly","saint","salad","sandy","sauce","scale","scene","scope","score","scout","screw","seize","sense","serve","seven","shake","shall","shame","shape","share","sharp","shelf","shell","shift","shore","short","shout","sight","since","sixth","sixty","skill","skull","slate","sleep","slice","slide","slope","smart","smell","smile","smoke","snake","solar","solid","solve","sorry","sound","south","space","spare","spark","speak","speed","spell","spend","spire","spite","spoke","spoon","sport","spray","squad","stack","staff","stage","stain","stake","stale","stamp","stand","stare","stark","start","state","steam","steel","steep","steer","stick","stiff","still","stone","stood","store","storm","story","stove","strap","straw","stray","strip","stuck","study","style","sugar","super","surge","surge","swear","sweet","swept","swift","sword",
  "table","taste","taunt","teach","tense","their","there","these","thick","thing","think","third","three","threw","throw","tiger","tight","tired","title","today","token","total","touch","tough","tower","toxic","trace","track","trade","trail","train","trait","tramp","trash","treat","trend","tribe","trick","tried","trite","troop","trout","trove","truck","truly","trump","trunk","trust","truth","tulip","tummy","tumor","tutor","twice","twist","tying",
  "udder","ultra","under","unify","union","until","upper","urban","utter",
  "valid","value","valve","video","vigor","viral","visit","vital","vivid","voice","voter",
  "waste","watch","water","weave","weigh","weird","whole","whose","width","woman","women","world","worry","worse","worst","worth","would","wound","wrath","write","wrote",
  "yacht","young","youth",
  "zonal",

  // 6-letter
  "accept","across","action","active","actual","advice","affect","afford","afraid","agency","agenda","almost","always","amount","animal","answer","anyone","around","arrive","artist","asking","attack","attend","august","avenue","baking","battle","beauty","became","become","before","behind","belief","belong","beside","better","beyond","bitter","bounce","bridge","bright","broken","burden","button","camera","cancel","candle","cannot","castle","caught","center","chance","change","charge","choose","chosen","circle","closet","couple","create","credit","crisis","damage","dancer","daring","darken","decide","define","degree","design","desire","detail","differ","direct","divide","donkey","double","driven","during","easily","effect","effort","eighth","enable","engine","enough","entire","escape","expect","extend","factor","failed","fallen","family","famous","father","figure","finger","finish","flight","flower","flying","follow","formal","format","foster","fourth","friday","friend","frozen","gadget","garden","gather","gentle","giving","global","happen","health","heaven","hidden","higher","hiring","holder","honest","income","indeed","insect","inside","jungle","keeper","kernel","ladder","latter","launch","leader","lesson","letter","little","lonely","longer","losing","luxury","making","manage","manner","market","matter","maybe","mental","method","mighty","mister","modern","moment","monthly","mother","moving","muscle","myself","nation","nature","nearby","needed","normal","notice","number","object","obtain","online","opened","orange","origin","output","palace","parent","partly","pepper","person","plenty","police","policy","prefer","pretty","prince","prison","profit","proper","proven","purple","python","rabbit","random","rather","reason","recent","record","reduce","refuse","region","relate","remove","repeat","rescue","resist","return","review","reward","riding","rubber","safety","sample","saving","saying","season","secret","select","settle","shadow","should","simple","single","sister","slight","smooth","social","source","spirit","spoken","spread","spring","square","stable","string","stroke","strong","struck","studio","stupid","supply","switch","system","taking","talent","target","taught","ticket","trying","twelve","twenty","unless","useful","utmost","valley","varied","virtue","vision","walker","warmth","wealth","weapon","winter","wisdom","wonder","wooden","wording","worsen","yellow",

  // game-specific common words
  "cat","cats","cast","mast","last","fast","mask","task","bask","past",
  "smart","start","stark","stars","parts","march","charm","chart","marsh","charms",
  "master","stream","basket","castle","master","grants","plants","flames",
]);

/**
 * Check if a string is a valid word
 */
export function isValidWord(word: string): boolean {
  return WORD_LIST.has(word.toLowerCase());
}

/**
 * Score a word by its length
 */
export function scoreWord(word: string): number {
  const len = word.length;
  if (len >= 6) return 40;
  if (len === 5) return 25;
  if (len === 4) return 15;
  if (len === 3) return 10;
  return 0;
}
