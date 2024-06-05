'use strict'

const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const dialog = require('dialog-node');
const xlsx = require('xlsx');
const fs = require('fs');

puppeteer.use(stealth());

async function createXlsx(nome, data, headers) {
    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(data);

    xlsx.utils.book_append_sheet(workbook, worksheet, nome);

    const buffer = await xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    return buffer;
}

async function sleep(time) {
    return await new Promise(resolve => setTimeout(resolve, time));
}

async function selectOption(page, selectorParam) {
    await page.evaluate((selector) => {
        const select = document.querySelector(selector.id)
        select.click();

        const option_select = document.querySelector(selector.id_option);
        option_select.click();
    }, selectorParam);
}

async function simulateProposal(page, cpf) {

    await page.goto('https://meu.bancomercantil.com.br/simular-proposta');

    const selectorConvenio = {
        id: '#mat-select-0',
        id_option: '#mat-option-6'
    };

    const selectorUf = {
        id: '#mat-select-2',
        id_option: '#mat-option-32'
    };

    const selectorInstituicao = {
        id: '#mat-select-4',
        id_option: '#mat-option-4'
    };

    const buttonConsultar = 'button.mat-flat-button.mat-button-base';
    const buttonNovaOperacao = 'a.mat-flat-button.mat-button-base';

    await sleep(1000);
    await selectOption(page, selectorConvenio);
    await selectOption(page, selectorInstituicao);

    await page.waitForResponse(
        response =>
            response.url() === 'https://api.mercantil.com.br:8443/pcb/sitebff/api/Produtos/Convenio/161594/Correspondente/981863' &&
            response.status() === 200
    );

    await sleep(500);
    await selectOption(page, selectorUf);

    await page.type('#mat-input-1', cpf, {
        delay: 20
    });

    await sleep(500);
    await page.click(buttonConsultar);

    // await page.waitForResponse(
    //     response =>
    //       response.url().includes('https://api.mercantil.com.br:8443/pcb/sitebff/api/PropostasProspect/PropostasEmDigitacao') && 
    //       response.status() === 200
    // );

    // Nova Operação
    await sleep(3500);
    await page.click(buttonNovaOperacao);

    await page.waitForResponse(
        response => response.url().includes('https://api.mercantil.com.br:8443/pcb/sitebff/api/PropostasProspect/') &&
            response.status() === 200
    );

    // Iniciar
    await sleep(10000);
    await page.click('a.mat-flat-button');

    // Simular
    await page.waitForResponse(
        response =>
            response.url() === ('https://api.mercantil.com.br:8443/pcb/sitebff/api/Produtos/Convenio/161594/Correspondente/981863/Empresa/4/SiglaUf/SC/ModalidadeCredito/SaqueAniversarioFgts') &&
            response.status() === 200
    );

    await sleep(1500);

    const isButtonDisabled = await page.evaluate(() => {
        const button = document.querySelector('button.mat-flat-button.mat-button-disabled');

        return button !== null;
    });

    if (isButtonDisabled) throw new Error('O botão está desativado.');

    await page.click('button.mat-flat-button');

    await page.waitForResponse(
        response =>
            response.url() === 'https://api.mercantil.com.br:8443/pcb/sitebff/api/Simulacoes/ParcelaInformada' &&
            response.status() === 200
    );

    await sleep(1000);
    const valorLiberado = await page.evaluate(() => {
        const elemento = document.querySelector('.valorLiberado');
        return elemento.textContent.trim();
    });

    const valorGarantia = await page.evaluate(() => {
        const elemento = document.querySelector('.saldoTotal strong');
        return elemento.textContent.trim();
    });

    return { cpf, valorLiberado, valorGarantia };
}

async function Mercantil({ password, user, data }) {
    try {

        // if (!data.cpfs.length) return response.status(200).send('Nenhum cpf para consulta!');
        // const data = { cpfs: [{ cpf: '11310823979' }] };

        const browser = await puppeteer.launch({
            // args: ['--start-maximized'],
            headless: false,
        });

        const page = await browser.newPage();

        await page.goto('https://meu.bancomercantil.com.br/login');
        await page.setViewport({ width: 1200, height: 700 });

        await sleep(2000);
        await page.type('#mat-input-0', user);

        await page.type('#mat-input-1', password);

        dialog.question("Você já realizou o captch?", "<Info>", 0, async (code, retVal, stderr) => {

            if (retVal == "OK") {
                // page.on('response', async (response) => {
                //     const url = response.url();
                //     console.log(`Recebeu uma resposta da URL: ${url}`);
                // });

                const saldoCpfs = [];
                const cpfsErros = [];

                let cpf_regex;
                for (const info of data) {

                    try {
                        cpf_regex = info.cpf.toString().replace(/[.-]/g, '');

                        const saldoCpf = await simulateProposal(page, cpf_regex);

                        saldoCpfs.push(saldoCpf);
                    } catch (error) {
                        cpfsErros.push({ cpf: cpf_regex });
                        continue;
                    }
                }

                const bufferCpfsErros = await createXlsx('cpfsComErros', cpfsErros, ['CPFS']);
                const bufferCpfsSaldos = await createXlsx('cpfsComSaldos', saldoCpfs, ['CPFS', 'VALORES LIBERADOS', 'VALORES GARANTIA']);

                await browser.close();

                return {
                    cpfsComErros: bufferCpfsErros.toString('base64'),
                    cpfsComSaldos: bufferCpfsSaldos.toString('base64'),
                    status: false,
                };
            } else {

            }
        });

    } catch (error) {
        console.error(error)
    }
}

module.exports = Mercantil;