import { Component, AfterViewInit, ElementRef } from '@angular/core';

import { availableKeyboards } from './available-keyboards';

import { glossingLanguages } from './glossing-languages';
import '../assets/keymanweb/keymanweb.js';
import '../assets/keymanweb/kmwuibutton.js';
declare var keyman: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements AfterViewInit {

  availableKeyboards = availableKeyboards;
  showAvailableKeyboards = false;

  elementRef: ElementRef;

  glossingLanguages = glossingLanguages;
  glosses = {};

  // keyboardsSet = false;
  installedKeyboards: any;

  constructor(elementRef: ElementRef) {
    this.elementRef = elementRef;
    this.glossingLanguages.map(language => {
      return this.glosses[language.bcp47] = '';
    });
  }

  ngAfterViewInit() {
    keyman.init({
      attachType: 'manual',
      ui: 'button',
      resources: 'assets/keymanweb',
    });
    this.addKeyboards();
    this.setKeyboards();
  }

  private addKeyboards() {
    this.glossingLanguages.map(language => {
      const keyboardCode = language.useKeyboard || language.bcp47;
      keyman.addKeyboards(`@${keyboardCode}`);
    });
  }


  private setKeyboards() {
    // if (!this.keyboardsSet) {
      this.glossingLanguages.map(language => {
        const keyboardCode = language.useKeyboard || language.bcp47;
        const el = this.elementRef.nativeElement.querySelector(`#${language.bcp47}`);
        keyman.attachToControl(el);
        keyman.setKeyboardForControl(el, language.internalName, keyboardCode);
        // language.loaded = true;
      });
    // }
  }

  // setupInput(language: IGlossLanguage) {
  //   const keyboardCode = language.useKeyboard || language.bcp47;
  //   const el = this.elementRef.nativeElement.querySelector(`#${language.bcp47}`);
  //   keyman.attachToControl(el);
  //   keyman.setKeyboardForControl(el, language.internalName, keyboardCode);
  //   setTimeout(() => {
  //     el.focus();
  //   }, 0);
  // }

  getKeyboards() {
    this.installedKeyboards = keyman.getKeyboards();
    console.log(this.installedKeyboards);
  }
}

// keyman.setActiveKeyboard(language.internalName, keyboardCode);
// tslint:disable: max-line-length
