const express = require('express')
const router = express.Router()

const complementoController = require('../controllers/complementoController')

// GRUPOS
router.get('/grupos', complementoController.listarGrupos)
router.post('/grupos', complementoController.criarGrupo)
router.put('/grupos/:id', complementoController.atualizarGrupo)
router.delete('/grupos/:id', complementoController.excluirGrupo)

// ITENS
router.get('/itens', complementoController.listarItens)
router.post('/itens', complementoController.criarItem)
router.put('/itens/:id', complementoController.atualizarItem)
router.delete('/itens/:id', complementoController.excluirItem)

// ITENS DO GRUPO
router.get('/grupos/:id/itens', complementoController.listarItensDoGrupo)

router.post('/grupos/:grupoId/itens/:itemId',
    complementoController.vincularItemAoGrupo
)

router.delete('/grupos/:grupoId/itens/:itemId',
    complementoController.removerItemDoGrupo
)

// GRUPOS DO PRODUTO
router.get('/produtos/:produtoId/grupos',
    complementoController.listarGruposDoProduto
)

router.put('/produtos/:produtoId/grupos',
    complementoController.vincularGruposProduto
)

module.exports = router