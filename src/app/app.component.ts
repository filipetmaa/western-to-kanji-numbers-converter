import { Component, ViewChild, ElementRef, OnInit, NgZone, HostListener  } from '@angular/core';
import { Firefly } from './firefly';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})

export class AppComponent implements OnInit {
  @ViewChild('canvas', { static: true }) canvas: ElementRef<HTMLCanvasElement>;
  ctx: CanvasRenderingContext2D;
  requestId;
  interval;
  resizeTimeout;
  fireflies: Firefly[] = [];
  numberOfFireflies = 100;
  refreshInterval = 30;
  result: string;
  readings: Readings[] = [];
  tempReadings: Readings = {hiragana: '', romaji: ''};
  synth = window.speechSynthesis;
  unmuted: boolean = true;
  
  @HostListener('window:resize')
  onWindowResize() {
    // Debounce resize, wait for resize to finish before doing stuff
    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
    }
    this.resizeTimeout = setTimeout((() => {
      this.setCanvasSize();
    }).bind(this), this.refreshInterval);
  }

  constructor( private ngZone: NgZone ) {}

  ngOnInit() {
    this.setCanvasSize();

    this.ctx = this.canvas.nativeElement.getContext('2d');
    
    for(var i = 0; i < this.numberOfFireflies; i++) {
      this.fireflies[i] = new Firefly(this.ctx);
      this.fireflies[i].reset();
    }
    this.ngZone.runOutsideAngular(() => this.draw());
    this.interval = setInterval(() => {
      this.draw();
    }, this.refreshInterval);
  }

  playTTS() {
    if(this.result != ''){
      let hiragana: string = '';
      this.readings.forEach(reading => {
        hiragana += reading.hiragana + ' ';
      });
      let audio = new SpeechSynthesisUtterance(hiragana);
      audio.lang = 'ja-JP';
      audio.pitch = 0.8;
      audio.rate = 0.9;
      this.synth.speak(audio);
    }
  }

  toggleMute() {
    this.unmuted = !this.unmuted;
  }

  draw() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.fireflies.forEach((firefly: Firefly) => {
      firefly.fade();
      firefly.move();
      firefly.draw();
    });
    this.requestId = requestAnimationFrame(() => this.draw);
  }

  setCanvasSize() {
    this.canvas.nativeElement.setAttribute('width', document.body.clientWidth.toString());
    this.canvas.nativeElement.setAttribute('height', document.body.clientHeight.toString());
  }

  convertToKanji(arabicNumber: string) {
    const sliceSize = 4;
    let index = arabicNumber.length;
    let numberSlice: string;
    let numberSliceArray: string[] = [];
    let resultArray: string[] = [];
    let isTooBig = false;

    if(+arabicNumber === 0) {
      if(arabicNumber === '') {
        this.result = '';
        this.readings = [];
      } else {
        this.result = '零';
        this.tempReadings.romaji = 'zero';
        this.tempReadings.hiragana = 'ゼロ';
        this.readings = [];
        this.readings.push(this.tempReadings);
      }
    } else {
      this.result = '';
      // Break number in blocks of four from right to left
      while (index > 0) {
        index -= sliceSize;
        numberSlice = arabicNumber.slice((index > 0 ? index : 0), index + sliceSize);
        numberSliceArray.push(numberSlice);
      }
      // Convert to kanji by block
      numberSliceArray.forEach((slice, i) => {
        if((i*4) <= 68) {
          let sliceLength = slice.length;
          let currentIndex = 0;
          let currentKanji;

          // Add unit to block
          if(+slice !== 0) {
            this.result += this.convertUnit(i*4);
          }
          // Convert block
          while (sliceLength--) {
            currentKanji = this.convertDecimal(slice.charAt(sliceLength));
            if (currentKanji) {
              this.result += this.convertUnit(currentIndex) + currentKanji;
            }
            currentIndex++;
          }
        } else {
          isTooBig = true;
        }
      });
      
      if(isTooBig) {
        this.result = 'この数が大きすぎます';
        this.tempReadings.romaji = 'This number is too big';
        this.tempReadings.hiragana = '';
        this.readings = [];
        this.readings.push(this.tempReadings);
      } else {

        // Convert to array to facilitate number cleanup
        resultArray = this.result.split('');

        // Remove '一' from units
        resultArray.forEach((kanji,i) => {
          if (resultArray[i] === '一') {
            if (i > 0 && this.isUnit(resultArray[i-1])) {
              resultArray.splice(i,1);
            }
          }
        });

        // Get reading array
        this.readings = [];
        for(let i=0; i<resultArray.length;i++) {
          if(this.isReadingException(resultArray[i],resultArray[i+1])) {
            this.tempReadings.romaji = this.getReadingException(resultArray[i], resultArray[i+1]);
            this.tempReadings.hiragana = this.getReadingExceptionHiragana(resultArray[i], resultArray[i+1]);
            let tempReading: Readings = {hiragana: this.tempReadings.hiragana, romaji: this.tempReadings.romaji};
            this.readings.push(tempReading);
            i++;
          } else {
            this.tempReadings.romaji = this.getKanjiReading(resultArray[i]);
            this.tempReadings.hiragana = this.getKanjiReadingHiragana(resultArray[i]);
            let tempReading: Readings = {hiragana: this.tempReadings.hiragana, romaji: this.tempReadings.romaji};
            this.readings.push(tempReading);
            i += this.getKanjiSize(resultArray[i]);
          }
        }

        this.result = resultArray.reverse().join('');
        this.readings = this.readings.reverse();
      }
    }

    if(this.unmuted) {
      this.playTTS();
    }
  }

  isUnit(kanjiUnit: string): boolean {
    switch(kanjiUnit) {
      case '十':
      case '百':
      case '千':
      case '万':
      case '億':
      case '兆':
      case '京':
      case '垓':
      case '杼':
      case '穣':
      case '溝':
      case '澗':
      case '正':
      case '載':
      case '極':
      case '恒':
      case '阿':
      case '那':
      case '不':
      case '無':
        return true;
      default:
        return false;
    }
  }

  isReadingException(unit: string, previousKanji: string): boolean {
    switch(unit) {
      case '百':
        switch(previousKanji) {
          case '三':
          case '六':
          case '八':
            return true;
          default:
            return false;
        }
      case '千':
        switch(previousKanji) {
          case '三':
          case '八':
            return true;
          default:
            return false;
        }
      case '兆':
        switch(previousKanji) {
          case '八':
          case '十':
            return true;
          default:
            return false;
        }
      case '京':
        switch(previousKanji) {
          case '六':
          case '八':
          case '十':
          case '百':
            return true;
          default:
            return false;
        }
      default:
        return false;
    }
  }

  getReadingException(unit: string, previousKanji: string): string {
    switch(unit) {
      case '百':
        switch(previousKanji) {
          case '三':
            return 'sanbyaku';
          case '六':
            return 'roppyaku';
          case '八':
            return 'happyaku';
          default:
            return '';
        }
      case '千':
        switch(previousKanji) {
          case '三':
            return 'sanzen';
          case '八':
            return 'hassen';
          default:
            return '';
        }
      case '兆':
        switch(previousKanji) {
          case '八':
            return 'hatchō';
          case '十':
            return 'jutchō';
          default:
            return '';
        }
      case '京':
        switch(previousKanji) {
          case '六':
            return 'rokkei';
          case '八':
            return 'hakkei';
          case '十':
            return 'jukkei';
          case '百':
            return 'hyakkei';
          default:
            return '';
        }
      default:
        return '';
    }
  }

  getReadingExceptionHiragana(unit: string, previousKanji: string): string {
    switch(unit) {
      case '百':
        switch(previousKanji) {
          case '三':
            return 'さんびゃく';
          case '六':
            return 'ろっぴゃく';
          case '八':
            return 'はっぴゃく';
          default:
            return '';
        }
      case '千':
        switch(previousKanji) {
          case '三':
            return 'さんぜん';
          case '八':
            return 'はっせん';
          default:
            return '';
        }
      case '兆':
        switch(previousKanji) {
          case '八':
            return 'はっちょう';
          case '十':
            return 'じゅうちょう';
          default:
            return '';
        }
      case '京':
        switch(previousKanji) {
          case '六':
            return 'ろけい';
          case '八':
            return 'はっけい';
          case '十':
            return 'じゅうけい';
          case '百':
            return 'ひゃけい';
          default:
            return '';
        }
      default:
        return '';
    }
  }

  getKanjiSize(kanji: string): number {
    switch(kanji) {
      case '沙':
      case '祇':
      case '他':
        return 2;
      case '議':
      case '数':
        return 3;
      default:
        return 0;
    }
  }
  
  convertUnit(unitHouse: number): string {
    switch(unitHouse) {
      case 1:
        return '十';
      case 2:
        return '百';
      case 3:
        return '千';
      case 4:
        return '万';
      case 8:
        return '億';
      case 12:
        return '兆';
      case 16:
        return '京';
      case 20:
        return '垓';
      case 24:
        return '杼';
      case 28:
        return '穣';
      case 32:
        return '溝';
      case 36:
        return '澗';
      case 40:
        return '正';
      case 44:
        return '載';
      case 48:
        return '極';
      case 52:
        return '沙河恒'; // 恒河沙 reversed
      case 56:
        return '祇僧阿'; // 阿僧祇 reversed
      case 60:
        return '他由那'; // 那由他 reversed
      case 64:
        return '議思可不'; // 不可思議 reversed
      case 68:
        return '数大量無'; // 無量大数 reversed
      default:
        return '';
    }
  }

  convertDecimal(decimalChar: string) {
    switch(decimalChar) {
      case '1':
        return '一';
      case '2':
        return '二';
      case '3':
        return '三';
      case '4':
        return '四';
      case '5':
        return '五';
      case '6':
        return '六';
      case '7':
        return '七';
      case '8':
        return '八';
      case '9':
        return '九';
      default:
        return null;
    }
  }

  getKanjiReading(kanji: string): string {
    switch(kanji) {
      case '一':
        return 'ichi';
      case '二':
        return 'ni';
      case '三':
        return 'san';
      case '四':
        return 'yon';
      case '五':
        return 'go';
      case '六':
        return 'roku';
      case '七':
        return 'nana';
      case '八':
        return 'hachi';
      case '九':
        return 'kyū';
      case '十':
        return 'jū';
      case '百':
        return 'hyaku';
      case '千':
        return 'sen';
      case '万':
        return 'man';
      case '億':
        return 'oku';
      case '兆':
        return 'chō';
      case '京':
        return 'kei';
      case '垓':
        return 'gai';
      case '杼':
        return 'jo';
      case '穣':
        return 'jō';
      case '溝':
        return 'kō';
      case '澗':
        return 'kan';
      case '正':
        return 'sei';
      case '載':
        return 'sai';
      case '極':
        return 'goku';
      case '沙':
        return 'gōgasha';
      case '祇':
        return 'asōgi';
      case '他':
        return 'nayuta';
      case '議':
        return 'fukashigi';
      case '数':
        return 'muryōtaisū';
      default:
        return '';
    }
  }

  getKanjiReadingHiragana(kanji: string): string {
    switch(kanji) {
      case '一':
        return 'いち';
      case '二':
        return 'に';
      case '三':
        return 'さん';
      case '四':
        return 'よん';
      case '五':
        return 'ご';
      case '六':
        return 'ろく';
      case '七':
        return 'なな';
      case '八':
        return 'はち';
      case '九':
        return 'きゅう';
      case '十':
        return 'じゅう';
      case '百':
        return 'ひゃく';
      case '千':
        return 'せん';
      case '万':
        return 'まん';
      case '億':
        return 'おく';
      case '兆':
        return 'ちょう';
      case '京':
        return 'けい';
      case '垓':
        return 'がい';
      case '杼':
        return 'じょ';
      case '穣':
        return 'じょう';
      case '溝':
        return 'こう';
      case '澗':
        return 'かん';
      case '正':
        return 'せい';
      case '載':
        return 'さい';
      case '極':
        return 'ごく';
      case '沙':
        return 'ごうがしゃ';
      case '祇':
        return 'あそうぎ';
      case '他':
        return 'なゆた';
      case '議':
        return 'ふかしぎ';
      case '数':
        return 'むりょうたいすう';
      default:
        return '';
    }
  }

  ngOnDestroy() {
    clearInterval(this.interval);
    cancelAnimationFrame(this.requestId);
  }
}

export class Readings {
  hiragana: string;
  romaji: string;
}

/*

  This project uses code for the fireflies from a codepen created by Kevin Vanderbeken:
  https://codepen.io/iamkevinv/pen/KoGEy

  Background image from:
  http://getwallpapers.com/wallpaper/full/7/a/3/696764-beautiful-ghibli-background-kodama-1920x1200-for-4k.jpg

  Japanese numerals sources:
  https://en.wikipedia.org/wiki/Japanese_numerals
  https://www.fluentin3months.com/japanese-numbers
  https://jisho.org/
  https://www.sljfaq.org/cgi/numbers.cgi

  Japanese numerals sheet:
  0 ------------------------------------------------------------------------ 零 -------- ゼロ (zero) ----------------------
  1 ------------------------------------------------------------------------ 一 -------- いち (ichi) ----------------------
  2 ------------------------------------------------------------------------ 二 -------- に (ni) --------------------------
  3 ------------------------------------------------------------------------ 三 -------- さん (san) -----------------------
  4 ------------------------------------------------------------------------ 四 -------- よん (yon) -----------------------
  5 ------------------------------------------------------------------------ 五 -------- ご (go) --------------------------
  6 ------------------------------------------------------------------------ 六 -------- ろく (roku) ----------------------
  7 ------------------------------------------------------------------------ 七 -------- なな (nana) ----------------------
  8 ------------------------------------------------------------------------ 八 -------- はち (hachi) ---------------------
  9 ------------------------------------------------------------------------ 九 -------- きゅう (kyū) ---------------------
  10 ----------------------------------------------------------------------- 十 -------- じゅう (jū) ---------------------- 10^1
  100 ---------------------------------------------------------------------- 百 -------- ひゃく (hyaku) ------------------- 10^2
  1000 --------------------------------------------------------------------- 千 -------- せん (sen) ----------------------- 10^3
  10000 -------------------------------------------------------------------- 万 -------- まん (man) ----------------------- 10^4
  100000 ------------------------------------------------------------------- 十万 ------ じゅうまん (jūman) ---------------- 10^5
  1000000 ------------------------------------------------------------------ 百万 ------ ひゃくまん (hyakuman) ------------- 10^6
  10000000 ----------------------------------------------------------------- 千万 ------ せんまん (senman) ----------------- 10^7
  100000000 ---------------------------------------------------------------- 億 -------- おく (oku) ----------------------- 10^8
  1000000000000 ------------------------------------------------------------ 兆 -------- ちょう (chō) --------------------- 10^12
  10000000000000000 -------------------------------------------------------- 京 -------- けい (kei) ----------------------- 10^16
  100000000000000000000 ---------------------------------------------------- 垓 -------- がい (gai) ----------------------- 10^20
  1000000000000000000000000 ------------------------------------------------ 杼 (𥝱) --- じょ (jo) ------------------------ 10^24
  10000000000000000000000000000 -------------------------------------------- 穣 -------- じょう (jō) ---------------------- 10^28
  100000000000000000000000000000000 ---------------------------------------- 溝 -------- こう (kō) ------------------------ 10^32
  1000000000000000000000000000000000000 ------------------------------------ 澗 -------- かん (kan) ----------------------- 10^36
  10000000000000000000000000000000000000000 -------------------------------- 正 -------- せい (sei) ----------------------- 10^40
  100000000000000000000000000000000000000000000 ---------------------------- 載 -------- さい (sai) ----------------------- 10^44
  1000000000000000000000000000000000000000000000000 ------------------------ 極 -------- ごく (goku) ---------------------- 10^48
  10000000000000000000000000000000000000000000000000000 -------------------- 恒河沙 ----- ごうがしゃ (gōgasha) -------------- 10^52
  100000000000000000000000000000000000000000000000000000000 ---------------- 阿僧祇 ----- あそうぎ (asōgi) ------------------ 10^56
  1000000000000000000000000000000000000000000000000000000000000 ------------ 那由他 ----- なゆた (nayuta) ------------------- 10^60
  10000000000000000000000000000000000000000000000000000000000000000 -------- 不可思議 --- ふかしぎ (fukashigi) --------------- 10^64
  100000000000000000000000000000000000000000000000000000000000000000000 ---- 無量大数 --- むりょうたいすう (muryōtaisū) ------- 10^68
  100000000000000000000000000000000000000000000000000000000000000000000000 - 千無量大数 - せんむりょうたいすう (senmuryōtaisū) - 10^71

  */
