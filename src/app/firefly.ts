export class Firefly {
  s = {ttl:8000, xmax:5, ymax:2, rmax:40, rt:1, xdef:960, ydef:540, xdrift:4, ydrift: 4, random:true, blink:true};
  refreshInterval = 30;
  x;
  y;
  r;
  dx;
  dy;
  hl;
  rt;
  stop;
  g;

  constructor(private ctx: CanvasRenderingContext2D) {}

  reset() {
    this.x = (this.s.random ? this.ctx.canvas.width*Math.random() : this.s.xdef);
    this.y = (this.s.random ? this.ctx.canvas.height*Math.random() : this.s.ydef);
    this.r = ((this.s.rmax-1)*Math.random()) + 1;
    this.dx = (Math.random()*this.s.xmax) * (Math.random() < .5 ? -1 : 1);
    this.dy = (Math.random()*this.s.ymax) * (Math.random() < .5 ? -1 : 1);
    this.hl = (this.s.ttl/this.refreshInterval)*(this.r/this.s.rmax);
    this.rt = Math.random()*this.hl;
    this.s.rt = Math.random()+1;
    this.stop = Math.random()*.2+.4;
    this.s.xdrift *= Math.random() * (Math.random() < .5 ? -1 : 1);
    this.s.ydrift *= Math.random() * (Math.random() < .5 ? -1 : 1);
  }

  fade() {
    this.rt += this.s.rt;
  }

  draw() {
    if(this.s.blink && (this.rt <= 0 || this.rt >= this.hl)) this.s.rt = this.s.rt*-1;
    else if(this.rt >= this.hl) this.reset();
    var newo = 1-(this.rt/this.hl);
    newo = newo*0.35;
    this.ctx.beginPath();
    this.ctx.arc(this.x,this.y,this.r,0,Math.PI*2,true);
    this.ctx.closePath();
    var cr = this.r*newo;
    this.g = this.ctx.createRadialGradient(this.x,this.y,0,this.x,this.y,(cr <= 0 ? 1 : cr));
    this.g.addColorStop(0.0, 'rgba(255,255,255,'+newo+')');
    this.g.addColorStop(this.stop, 'rgba(122,117,175,'+(newo*.4)+')');
    this.g.addColorStop(1.0, 'rgba(122,117,175,0)');
    this.ctx.fillStyle = this.g;
    this.ctx.fill();
  }

  move() {
    this.x += (this.rt/this.hl)*this.dx;
    this.y += (this.rt/this.hl)*this.dy;
    if(this.x > this.ctx.canvas.width || this.x < 0) this.dx *= -1;
    if(this.y > this.ctx.canvas.height || this.y < 0) this.dy *= -1;
  }

  getX() { return this.x; }
  getY() { return this.y; }
}