/** E2E: diseño, pie de página, teclado y adaptación a móvil (RNF-01, RNF-10, RNF-13). */
import { expect, test } from '@playwright/test';
import { DEMO, FOOTER, login } from './support';

const PUBLIC_PAGES = [
  ['/login', 'Iniciar sesión'],
  ['/registro', 'Crear cuenta'],
  ['/recuperar', 'Recuperar contraseña'],
  ['/restablecer', 'Enlace no válido'],
  ['/esta-ruta-no-existe', 'Esta página no existe'],
] as const;

const noHorizontalScroll = (page: import('@playwright/test').Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth);

test.describe('TC-E2E-LAY: diseño y pie de página', () => {
  for (const [path, heading] of PUBLIC_PAGES) {
    test(`TC-E2E-LAY-01 ${path}: muestra el pie de página, queda al fondo y no se desborda`, async ({
      page,
    }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { name: heading })).toBeVisible();

      const footer = page.getByText(FOOTER);
      await expect(footer).toBeVisible();
      expect(await noHorizontalScroll(page)).toBe(true);
      const box = (await footer.boundingBox())!;
      const viewport = page.viewportSize()!;
      expect(box.y + box.height).toBeGreaterThan(
        Math.min(viewport.height, await page.evaluate(() => document.body.scrollHeight)) - 80,
      );
    });
  }

  test('TC-E2E-LAY-02 el tablero (pantalla privada) muestra el pie de página y no se desborda', async ({
    page,
  }) => {
    await login(page, DEMO.email, DEMO.password);
    await expect(page.getByRole('heading', { name: /Hola/ })).toBeVisible();

    await expect(page.getByText(FOOTER)).toBeVisible();
    expect(await noHorizontalScroll(page)).toBe(true);
  });

  test('TC-E2E-LAY-03 con el teclado se recorre el login en orden lógico (correo, contraseña, Mostrar, ¿Olvidaste?, enviar) y el foco se ve', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();

    const order: string[] = [];
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      order.push(
        await page.evaluate(() => {
          const el = document.activeElement as HTMLElement;
          const outline = getComputedStyle(el).outlineStyle;
          return `${el.getAttribute('type') ?? el.tagName.toLowerCase()}:${el.textContent?.trim() || ''}:${outline}`;
        }),
      );
    }

    expect(order.map((item) => item.split(':')[0])).toEqual([
      'email',
      'password',
      'button',
      'a', // «¿Olvidaste tu contraseña?», justo debajo del campo
      'submit',
    ]);
    expect(order.every((item) => item.endsWith(':solid'))).toBe(true); // todos con anillo de foco visible
  });

  test('TC-E2E-LAY-04 el botón de cerrar sesión es negro y los botones principales son naranjas, sin sombra ni borde', async ({
    page,
  }) => {
    await page.goto('/login');
    const primary = await page.getByRole('button', { name: 'Iniciar sesión' }).evaluate((el) => {
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, border: s.borderTopWidth, shadow: s.boxShadow };
    });
    expect(primary).toEqual({ background: 'rgb(217, 84, 30)', border: '0px', shadow: 'none' });

    await login(page, DEMO.email, DEMO.password);
    const logoutButton = await page
      .getByRole('button', { name: 'Cerrar sesión' })
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return { background: s.backgroundColor, border: s.borderTopWidth, shadow: s.boxShadow };
      });
    expect(logoutButton).toEqual({ background: 'rgb(17, 17, 17)', border: '0px', shadow: 'none' });
  });

  test('TC-E2E-LAY-05 el atajo de la cuenta de prueba no aparece para los usuarios', async ({
    page,
  }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();

    await expect(page.getByText('demo@taskflow.dev')).toHaveCount(0);
  });
});
