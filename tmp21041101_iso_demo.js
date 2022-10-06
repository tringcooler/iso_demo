$(document).ready(() => {
    
    const asleep = ms => new Promise(resolve => {
        setTimeout(resolve, ms);
    });
    
    const BOX_HI_LEN = Math.sqrt(1 - 0.5 * 0.5);
    function draw_box(ctx, x, y, sz) {
        let hi_len = BOX_HI_LEN * sz;
        let bot_len = sz;
        ctx.save();
        ctx.strokeStyle="#101010";

        ctx.fillStyle = '#c08080';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + hi_len, y - 0.5 * bot_len);
        ctx.lineTo(x + hi_len, y + 0.5 * bot_len);
        ctx.lineTo(x, y + bot_len);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#80c080';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - hi_len, y - 0.5 * bot_len);
        ctx.lineTo(x - hi_len, y + 0.5 * bot_len);
        ctx.lineTo(x, y + bot_len);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#8080c0';
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - hi_len, y - 0.5 * bot_len);
        ctx.lineTo(x, y - bot_len);
        ctx.lineTo(x + hi_len, y - 0.5 * bot_len);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
    
    function draw_circle(ctx, x, y, sz) {
        let hi_len = BOX_HI_LEN * sz;
        let bot_len = sz;
        ctx.save();
        ctx.strokeStyle="#101010";

        ctx.fillStyle = '#c080c0';
        ctx.beginPath();
        ctx.arc(x, y, hi_len, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        ctx.restore();
    }
    
    class c_character {
        
        constructor(cb_draw, size, offset) {
            this.draw_char = cb_draw;
            this.grid_size = size;
            this.char_size = [size * BOX_HI_LEN, size];
            this.offset = offset;
        }
        
        calc_dpos(x, y, h) {
            let [ox, oy] = this.offset;
            let th = this.char_size[1] / 2;
            let tw = this.char_size[0];
            let dx = ox - y * tw + x * tw;
            let dy = oy + y * th + x * th - h * th * 2;
            return [dx, dy];
        }
        
        set_pos(x, y, h) {
            this.x = x;
            this.y = y;
            this.h = h;
            [this.dx, this.dy] = this.calc_dpos(this.x, this.y, this.h);
            return this;
        }
        
        async move_to(x, y, h, dur = 100) {
            let tw = new TWEEN.Tween(this);
            let [dst_dx, dst_dy] = this.calc_dpos(x, y, h);
            this.x = (this.x + x) / 2;
            this.y = (this.y + y) / 2;
            this.h = (this.h + h) / 2;
            tw.to({dx: dst_dx, dy: dst_dy}, dur);
            let prm = new Promise(resolve => {
                tw.onComplete(resolve).onStop(resolve).start();
            });
            await prm;
            this.set_pos(x, y, h);
        }
        
        draw() {
            this.draw_char(this.dx, this.dy, this.grid_size);
        }
        
    }
    
    class c_scene {
        
        constructor(tiles_info, cb_draw, size, offset) {
            this.tiles_info = tiles_info;
            this.draw_tile = cb_draw;
            this.grid_size = size;
            this.tile_size = [size * BOX_HI_LEN, size];
            this.offset = offset;
            this.char_list = [];
            this.setup_grid();
        }
        
        setup_grid() {
            let grid = [];
            let max_tval = Math.max(...this.tiles_info.map(row => Math.max(...row)));
            let max_h = Math.floor(Math.log2(max_tval)) + 1;
            let [max_x, max_y] = [this.tiles_info[0].length, this.tiles_info.length];
            for(let depth = 0; depth <= max_x + max_y + max_h - 3; depth += 0.5) {
                for(let h = 0; h <= max_h - 1; h += 0.5) {
                    for(let x = 0; x <= max_x - 1; x += 0.5) {
                        let y = depth - h - x;
                        if(y < 0 || y > max_y - 1) {
                            continue;
                        }
                        let is_tile = true;
                        if((x % 1 ) || (y % 1 ) || (h % 1 )) {
                            is_tile = false;
                        }
                        grid.push([is_tile, x, y, h]);
                    }
                }
            }
            this.grid = grid;
        }
        
        new_char(cb_draw, pos) {
            let ch = new c_character(cb_draw, this.grid_size, this.offset).set_pos(...pos);
            this.char_list.push(ch);
            return ch;
        }
        
        update() {
            let char_order = {};
            for(let ch of this.char_list) {
                let t = char_order;
                t = t[ch.x] = (t[ch.x] ?? {});
                t = t[ch.y] = (t[ch.y] ?? {});
                t[ch.h] = ch;
            }
            let [ox, oy] = this.offset;
            let th = this.tile_size[1] / 2;
            let tw = this.tile_size[0];
            for(let order = 0; order < this.grid.length; order++) {
                let [is_tile, x, y, h] = this.grid[order];
                if(is_tile) {
                    let dx = ox - y * tw + x * tw;
                    let dy = oy + y * th + x * th - h * th * 2;
                    let tseq = this.tiles_info[y][x];
                    let tval = (tseq & (1 << h));
                    if(tval) {
                        this.draw_tile(dx, dy, this.grid_size);
                    }
                }
                let ch = char_order[x]?.[y]?.[h];
                if(ch) {
                    ch.draw();
                }
            }
        }
    }

    async function ticker(scene, clear) {
        while(true) {
            await asleep(33);
            clear();
            TWEEN.update();
            scene.update();
        }
    }

    async function main() {
        let el_cvs = document.getElementById('cvs1');
        let ctx = el_cvs.getContext('2d');
        console.log('start');
        scene = new c_scene([
            [1, 1, 3, 1, 1],
            [1, 1, 3, 1, 1],
            [1, 1, 3, 1, 1],
            [1, 1, 3, 1, 1],
            [15, 11, 15, 11, 15],
            [1, 1, 3, 1, 1],
            [1, 1, 3, 1, 1],
            [1, 1, 3, 1, 1],
            [31, 19, 31, 19, 31],
            [1, 1, 3, 1, 1],
            [1, 1, 3, 1, 1],
            [1, 1, 3, 1, 1],
            [3, 3, 7, 3, 3],
            [1, 1, 3, 1, 1],
            [1, 1, 3, 1, 1],
        ], (x, y, sz) => {
            draw_box(ctx, x, y, sz);
        }, 30, [450, 150]);
        let ch = scene.new_char((x, y, sz) => {
            draw_circle(ctx, x, y, sz);
        }, [2, 0, 2]);
        ticker(scene, () => {
            ctx.clearRect(0, 0, el_cvs.width, el_cvs.height);
        });
        for(let [x, y, h] of [
            [2, 1, 2],
            [2, 2, 2],
            [2, 3, 2],
            [3, 3, 2],
            [3, 3, 1],
            [3, 3, 2],
            [3, 4, 2],
            [3, 5, 2],
            [3, 5, 1],
            [3, 5, 2],
            [2, 5, 2],
            [1, 5, 2],
            [1, 5, 1],
            [1, 5, 2],
            [1, 4, 2],
            [1, 3, 2],
            [2, 3, 2],
            [3, 3, 2],
            [3, 4, 2],
            [3, 5, 2],
            [2, 5, 2],
            [2, 6, 2],
            [2, 7, 2],
            [3, 7, 2],
            [3, 7, 1],
            [3, 7, 2],
            [3, 8, 2],
            [3, 9, 2],
            [3, 9, 1],
            [3, 9, 2],
            [2, 9, 2],
            [1, 9, 2],
            [1, 9, 1],
            [1, 9, 2],
            [1, 8, 2],
            [1, 7, 2],
            [2, 7, 2],
            [3, 7, 2],
            [3, 8, 2],
            [3, 9, 2],
            [2, 9, 2],
            [2, 10, 2],
            [3, 10, 2],
            [3, 10, 1],
            [3, 11, 1],
            [3, 11, 2],
            [3, 12, 2],
            [3, 13, 2],
            [3, 13, 1],
            [3, 13, 2],
            [2, 13, 2],
            [1, 13, 2],
            [1, 13, 1],
            [1, 13, 2],
            [1, 12, 2],
            [1, 11, 2],
            [1, 11, 1],
            [1, 11, 2],
            [2, 11, 2],
            [3, 11, 2],
            [3, 12, 2],
            [3, 13, 2],
            [3, 13, 1],
            [4, 13, 1],
            [4, 14, 1],
        ]) {
            await ch.move_to(x, y, h, 300);
        }
        return [scene, ch];
    }

    main();
});