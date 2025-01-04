class Cena{
	constructor(universo, mundo, contexto){
        this._universo = universo;
        this._mundo = mundo;
        this._contexto = contexto;
        this._cenario;
        this._teclasPressionadas = [];
        this._movimentandoComTeclas;
	}

    _realizarMovimento(tecla){
        if (this._teclasPressionadas.includes(tecla))
            this._teclasPressionadas.splice(this._teclasPressionadas.indexOf(tecla), 1);	
        this._teclasPressionadas.push(tecla);

        this._cenario.personagem.posDestinoX = undefined;
        this._cenario.personagem.posDestinoY = undefined;            

        this._cenario.personagem.iniciarComandoTeclado(this._teclasPressionadas[this._teclasPressionadas.length - 1]);
    }

    _pararMovimento(tecla){
        this._teclasPressionadas.splice(this._teclasPressionadas.indexOf(tecla), 1);

        this._cenario.personagem.finalizarComandoTeclado(this._teclasPressionadas[this._teclasPressionadas.length - 1]);
    } 

    prepararMundo(){
        if(this._cenario && this._cenario.personagem)
        {
            this._mundo.addEventListener('keydown', (event) => {
                if (this._cenario.personagem.obterAcaoParaTecla(event.code)){
                    this._realizarMovimento(event.code);
                    this._movimentandoComTeclas = true;                    
                }                                   
            });

            this._mundo.addEventListener('keyup', (event) => {
                if (this._movimentandoComTeclas){
                    this._pararMovimento(event.code);
                    if (this._teclasPressionadas.length == 0)
                        this._movimentandoComTeclas = false;
                }
            });

            this._mundo.addEventListener('mousedown', (event) => {
                if(!this._movimentandoComTeclas){
                    this._cenario.personagem.iniciarComandoTouch(event.pageX, event.pageY);
                }             
            });           
        }
    }

	reproduzir(){
        if(this._cenario) this._cenario.desenhar(this._contexto);

        this._universo.requestAnimationFrame(() => this.reproduzir());
	}

    get cenario(){
        return this._cenario;
    }

    set cenario(cenario){
        this._cenario = cenario;
    }
}

class Cenario{
	constructor(img, comprimento, altura){
        this._personagem;

        this._comprimento = comprimento;
        this._altura = altura;

        this._imagem = new Image();
        this._imagem.src = img;
	}

    desenharCirculo(contexto, tamanho, preenchido){
        contexto.lineWidth = 3;
        contexto.globalAlpha = 0.4;

        contexto.beginPath();
        contexto.setLineDash([]);
        contexto.arc((this._personagem.posDestinoX) ? this._personagem.posDestinoX  : this._personagem.centroX , 
                     (this._personagem.posDestinoY) ? this._personagem.posDestinoY : this._personagem.centroY , 
                     tamanho, 
                     0, 
                     2 * Math.PI);
        
        if (preenchido){
            contexto.fillStyle = 'darkslategray';
            contexto.fill();          
        }
        else{
            contexto.strokeStyle = 'darkslategray';
            contexto.stroke();
        }      
    }

    desenharAlvoDoDestino(contexto){
        this.desenharCirculo(contexto, 15, true);
        this.desenharCirculo(contexto, 15, false);
    }

	desenhar(contexto){
        contexto.globalAlpha = 1;
        contexto.drawImage(this._imagem, 0, 0, this._comprimento, this._altura, 0, 0, this._comprimento, this._altura);

        if(this._personagem){
            if(this._personagem.posDestinoY || this._personagem.posDestinoX){
                this.desenharAlvoDoDestino(contexto);
            }

            this._personagem.desenhar(contexto, (this._personagem.centroY > this._altura), 
                                                (this._personagem.centroY < 0), 
                                                (this._personagem.centroX > this._comprimento), 
                                                (this._personagem.centroX < 0));
        }
	}

    set personagem(personagem){
        this._personagem = personagem;
    }

    get personagem(){
        return this._personagem;
    }
}

const comandos = {
	cima(personagem){
		personagem.velX = 0;
		personagem.velY = -personagem.modificadorVelocidade;
		personagem._sprite.paraCima();
	},
	baixo(personagem){
		personagem.velX = 0;
		personagem.velY = +personagem.modificadorVelocidade;
		personagem._sprite.paraBaixo();
	},
	direita(personagem){
		personagem.velX = +personagem.modificadorVelocidade;
		personagem.velY = 0;
		personagem._sprite.paraDireita();
	},			
	esquerda(personagem){
		personagem.velX = -personagem.modificadorVelocidade;
		personagem.velY = 0;
		personagem._sprite.paraEsquerda();
	}
}

class Sprite{
	constructor(img, cima, baixo, direita, esquerda, direcaoInicial, comprimento, altura, qtdAnimacoes){
		this._codigosDirecao = {
			'cima': cima,
			'baixo': baixo,
			'direita': direita,
			'esquerda': esquerda			
		};
		
		this.atualDirecao = this._codigosDirecao[direcaoInicial];

		this.comprimento = comprimento;
		this.altura = altura;
		this.qtdAnimacoes = qtdAnimacoes;

		this.imagem = new Image();
		this.imagem.src = img;
	}

	paraCima(){
		this.atualDirecao = this._codigosDirecao['cima'];
	}

	paraBaixo(){
		this.atualDirecao = this._codigosDirecao['baixo'];
	}

	paraDireita(){
		this.atualDirecao = this._codigosDirecao['direita'];
	}

	paraEsquerda(){
		this.atualDirecao = this._codigosDirecao['esquerda'];
	}
}

class Personagem{
	constructor(sprite, teclasConfiguradasPorComando, modificadorVelocidade){       
        this._sprite = sprite;

		this._teclasDeComandos = teclasConfiguradasPorComando;

		this._proximaAnimacao = 0;
		this._posX = 150; 
		this._posY = 0; 
        this._posDestinoX = 0; 
        this._posDestinoY = 0;		
        this._velX = 0; 
        this._velY = 0;
		
		this.modificadorVelocidade = modificadorVelocidade;

		this._andando = false;
		this._contadorDePassos;
		
        this._proximoMovimentoX;
        this._proximoMovimentoY;		
	}

    set velX(velX){
        this._velX = velX;
    }

    set velY(velY){
        this._velY = velY;
	}
	
    get velX(){
        return this._velX;
    }

    get velY(){
        return this._velY;
	}	

    set posDestinoX(posDestinoX){
        this._posDestinoX = posDestinoX;
    }

    set posDestinoY(posDestinoY){
        this._posDestinoY = posDestinoY;
	}	

    get posDestinoX(){
        return this._posDestinoX;
    }

    get posDestinoY(){
        return this._posDestinoY;
	}	

    get centroX(){
        return this._posX + this._sprite.comprimento/2;
    }

    get centroY(){
        return this._posY + this._sprite.altura/2;
	}

    get posX(){
        return this._posX;
    }

    get posY(){
        return this._posY;
	}

    set posX(posX){
        this._posX = posX;
    }

    set posY(posY){
        this._posY = posY;
	}	
	
    get comprimento(){
        return this._sprite.comprimento;
    }

    get altura(){
        return this._sprite.altura;
    }	

	desenhar(contexto, limiteBaixo, limiteCima, limiteDireita, limiteEsquerda){
		contexto.globalAlpha = 1;
		
		contexto.drawImage(this._sprite.imagem, 
						   (this._proximaAnimacao * this._sprite.comprimento), 
						   this._sprite.atualDirecao, 
						   this._sprite.comprimento, this._sprite.altura, 
						   0 + this._posX, 0 + this._posY, 
						   this._sprite.comprimento, this._sprite.altura);

        this._prepararProximoMovimento(limiteBaixo, limiteCima, limiteDireita, limiteEsquerda);
    }

    _prepararProximoMovimento(limiteBaixo, limiteCima, limiteDireita, limiteEsquerda){
		if (this._andando) 
		{
			if (!limiteDireita && this._velX > 0 || !limiteEsquerda && this._velX < 0)
			{
				this._posX += ((this._posDestinoX) && Math.abs(this._posDestinoX - this.centroX) < Math.abs(this._velX)) ? this._posDestinoX - this.centroX : this._velX;			
			} 

			if (!limiteBaixo && this._velY > 0 || !limiteCima && this._velY < 0)
			{
				this._posY += ((this._posDestinoY) && Math.abs(this._posDestinoY - this.centroY) < Math.abs(this._velY)) ? this._posDestinoY - this.centroY : this._velY;
			}
			
			if (this._posDestinoX && this.centroX == this._posDestinoX){
				this._posDestinoX = undefined;
				if (this._posDestinoY)
					this._definirDirecao(this._proximoMovimentoY);
				else
					this.finalizarComando('')	
			}
			else if (this._posDestinoY && this.centroY == this._posDestinoY){
				this._posDestinoY = undefined;
				if (this._posDestinoX)
					this._definirDirecao(this._proximoMovimentoX);
				else
					this.finalizarComando('')						
			}
		}
		else 
		{
			this._proximaAnimacao = 0;
		}	
	}
	
	_trocarAnimacao(){
		if (this._proximaAnimacao === this._sprite.qtdAnimacoes-1) {
			this._proximaAnimacao = 0;
		} else {	
			this._proximaAnimacao++;
		}
	}
    
    _definirDirecao(acao) {
        let movimentar = comandos[acao];
		if(movimentar) movimentar(this);
		return movimentar;
    }
	
	obterAcaoParaTecla(tecla){
		return this._teclasDeComandos[tecla];
	}

	iniciarComandoTouch(novoDestinoX, novoDestinoY){
		this._posDestinoX = novoDestinoX;
		this._posDestinoY = novoDestinoY;

		this._proximoMovimentoX = (this.centroX > this._posDestinoX) ? 'esquerda':'direita';
		this._proximoMovimentoY = (this.centroY > this._posDestinoY) ? 'cima':'baixo';

        let distanciaDestinoX = Math.abs(this._posDestinoX - this.centroX);
        let distanciaDestinoY = Math.abs(this._posDestinoY - this.centroY);

        (distanciaDestinoX > distanciaDestinoY) ? this.iniciarComando(this._proximoMovimentoY) : this.iniciarComando(this._proximoMovimentoX);
	}

	iniciarComandoTeclado(tecla){
		this.iniciarComando(this._teclasDeComandos[tecla]);	
	}

	finalizarComandoTeclado(tecla){
		this.finalizarComando(this._teclasDeComandos[tecla]);	
	}	

    iniciarComando(acao){
		this._andando = !!this._definirDirecao(acao);
		if(!this._contadorDePassos && this._andando){
			this._trocarAnimacao();
			this._contadorDePassos = setInterval(() => this._trocarAnimacao(), 200);
		}	
    }
    
    finalizarComando(acao){
		this._andando = !!this._definirDirecao(acao);
		if(!this._andando){
			clearInterval(this._contadorDePassos)
			this._contadorDePassos = undefined;
		}        
    }    
}

let canvas = document.querySelector('.myCanvas');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
let contexto = canvas.getContext('2d');

let cena = new Cena(window, document, contexto);

cena.cenario = new Cenario('https://raw.githubusercontent.com/satoLG/walking_pkmn_trainer/master/img/grass.png', canvas.width, canvas.height);

let configuracaoDeTeclas = {
    KeyW : 'cima',
    KeyS : 'baixo',
    KeyD : 'direita',
    KeyA : 'esquerda'
}

cena.cenario.personagem = new Personagem(new Sprite('https://raw.githubusercontent.com/satoLG/walking_pkmn_trainer/master/img/sprite.png', 200, 8, 138, 74, 'baixo', 64, 64, 4), configuracaoDeTeclas, 2);

cena.prepararMundo();

cena.reproduzir();