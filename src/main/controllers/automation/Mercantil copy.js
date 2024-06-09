'use strict'

const puppeteer = require('puppeteer-extra');
const stealth = require('puppeteer-extra-plugin-stealth');
const dialog = require('dialog-node');
const xlsx = require('xlsx');
const fs = require('fs');

const Campaign = require('../../db/models/tb_campaigns');
const Instance = require('../../db/models/tb_instances');

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

    // Aguardar a pagína carregar
    await sleep(3000);

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

    await selectOption(page, selectorConvenio);

    await sleep(1000);

    await selectOption(page, selectorInstituicao);

    await sleep(2000);
    await selectOption(page, selectorUf);

    await sleep(2000);
    await page.type('#mat-input-1', cpf, {
        delay: 50
    });

    await sleep(2000);
    await page.click(buttonConsultar);

    // Nova Operação
    await sleep(3500);
    await page.click(buttonNovaOperacao);

    // Iniciar
    await sleep(10000);
    await page.click('a.mat-flat-button');

    // Simular
    await sleep(2000);

    const isButtonDisabled = await page.evaluate(() => {
        const button = document.querySelector('button.mat-flat-button.mat-button-disabled');

        return button !== null;
    });

    if (isButtonDisabled) throw new Error('O botão está desativado.');

    await page.click('button.mat-flat-button');

    await sleep(3000);
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

async function Mercantil({ password, user, instanceNumber, timeLoggedIn, idCampaign, data }) {
    try {

        const browser = await puppeteer.launch({
            // args: ['--start-maximized'],
            headless: false,
        });

        const page = await browser.newPage();

        await page.goto('https://meu.bancomercantil.com.br/login');
        await page.setViewport({ width: 1200, height: 700 });

        await sleep(1000);
        await page.type('#mat-input-0', user);

        await page.type('#mat-input-1', password);

        dialog.question(`Você já logou na instância ( ${instanceNumber} )?`, "<Info>", 0, async (code, retVal, stderr) => {

            if (retVal == "OK") {

                const start_time = process.hrtime();

                const saldoCpfs = [];
                const cpfsErros = [];

                data.forEach(async (info, index) => {
 
                    try {

                        // if (index == 10) {
                        //     await Campaign.update(
                        //         { query_data: saldoCpf },
                        //         {
                        //             where: {
                        //                 id: idCampaign
                        //             }
                        //         }
                        //     );
                        // }

                        const cpf_regex = info.cpf.toString().replace(/[.-]/g, '');
                
                        const saldoCpf = await simulateProposal(page, cpf_regex);
                
                        saldoCpfs.push(saldoCpf);
                    } catch (error) {
                        cpfsErros.push({ cpf: info.cpf });
                    }
                });
                

                // const bufferCpfsErros = await createXlsx('cpfsComErros', cpfsErros, ['CPFS']);
                // const bufferCpfsSaldos = await createXlsx('cpfsComSaldos', saldoCpfs, ['CPFS', 'VALORES LIBERADOS', 'VALORES GARANTIA']);

                await browser.close();

                const end_time = process.hrtime(start_time);

                const executionTime = (end_time[0] * 1000) + (end_time[1] / 1e6);

                await Instance.update(
                    {
                        status: 'LIVRE',
                        time_logged_in: timeLoggedIn + executionTime
                    },
                    {
                        where: {
                            instance: instanceNumber
                        }
                    }
                );

                await Campaign.update(
                    {
                        status: 'CONCLUÍDA',
                    },
                    {
                        where: {
                            id: idCampaign
                        }
                    }
                );
            } else {
                await Instance.update(
                    { status: 'LIVRE' },
                    {
                        where: {
                            instance: instanceNumber,
                        }
                    }
                );

                await Campaign.update(
                    {
                        status: 'CANCELADA',
                    },
                    {
                        where: {
                            id: idCampaign
                        }
                    }
                );
            }
        });

    } catch (error) {
        await Instance.update(
            { status: 'LIVRE' },
            {
                where: {
                    instance: instanceNumber,
                }
            }
        );

        await Campaign.update(
            {
                status: 'CANCELADA',
            },
            {
                where: {
                    id: idCampaign
                }
            }
        );
    }
}

module.exports = Mercantil;