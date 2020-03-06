import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { MatIconModule } from "@angular/material";
import { DigitOnlyDirective } from './directives/digit-only.directive';
import { AppComponent } from './app.component';

@NgModule({
  declarations: [
    AppComponent,
    DigitOnlyDirective
  ],
  imports: [
    BrowserModule,
    MatIconModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }